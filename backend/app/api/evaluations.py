"""API routes for evaluation runs and results."""

import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db, async_session
from app.models import EvaluationRun, EvaluationResult
from app.schemas.evaluation import (
    EvaluationRunCreate,
    EvaluationRunResponse,
    EvaluationResultResponse,
)
from app.services.evaluation_service import run_evaluation

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


async def _run_evaluation_background(run_id: str, config: EvaluationRunCreate):
    """Run evaluation in background task with its own session."""
    async with async_session() as db:
        try:
            await run_evaluation(db, config, run_id=run_id)
        except Exception as e:
            import logging
            from datetime import datetime, timezone
            logger = logging.getLogger(__name__)
            logger.error(f"Background evaluation failed: {e}")
            try:
                # Update run status to failed
                result = await db.execute(select(EvaluationRun).where(EvaluationRun.id == run_id))
                run = result.scalar_one_or_none()
                if run:
                    run.status = "failed"
                    run.completed_at = datetime.now(timezone.utc)
                    await db.commit()
            except Exception as inner_e:
                logger.error(f"Failed to update failed run status: {inner_e}")


@router.post("/run", response_model=EvaluationRunResponse, status_code=202)
async def start_evaluation(
    config: EvaluationRunCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Start a new evaluation run. Runs asynchronously in the background."""
    # Create the run record first so we can return the ID immediately
    run = EvaluationRun(
        name=config.name,
        status="pending",
        config={
            "model_ids": config.model_ids,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "evaluator_type": config.evaluator_type,
            "category_filter": config.category_filter,
        },
    )
    db.add(run)
    await db.flush()
    await db.refresh(run)

    # Queue evaluation in background with run ID
    background_tasks.add_task(_run_evaluation_background, run.id, config)

    return EvaluationRunResponse(
        id=run.id,
        name=run.name,
        status="pending",
        config=run.config,
        created_at=run.created_at,
    )


@router.get("", response_model=list[EvaluationRunResponse])
async def list_evaluations(db: AsyncSession = Depends(get_db)):
    """List all evaluation runs."""
    result = await db.execute(
        select(EvaluationRun).order_by(EvaluationRun.created_at.desc())
    )
    runs = result.scalars().all()

    # Enrich with total_results count
    responses = []
    for run in runs:
        count_query = select(func.count()).where(
            EvaluationResult.evaluation_run_id == run.id
        )
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        responses.append(
            EvaluationRunResponse(
                id=run.id,
                name=run.name,
                status=run.status,
                config=run.config,
                started_at=run.started_at,
                completed_at=run.completed_at,
                created_at=run.created_at,
                total_results=total,
            )
        )
    return responses


@router.get("/{run_id}", response_model=EvaluationRunResponse)
async def get_evaluation(run_id: str, db: AsyncSession = Depends(get_db)):
    """Get evaluation run status and metadata."""
    result = await db.execute(
        select(EvaluationRun).where(EvaluationRun.id == run_id)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found")

    count_result = await db.execute(
        select(func.count()).where(EvaluationResult.evaluation_run_id == run_id)
    )
    total = count_result.scalar() or 0

    return EvaluationRunResponse(
        id=run.id,
        name=run.name,
        status=run.status,
        config=run.config,
        started_at=run.started_at,
        completed_at=run.completed_at,
        created_at=run.created_at,
        total_results=total,
    )


@router.get("/{run_id}/results", response_model=list[EvaluationResultResponse])
async def get_evaluation_results(
    run_id: str,
    model_id: str | None = None,
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed results for an evaluation run with optional filters."""
    # Verify run exists
    run_check = await db.execute(
        select(EvaluationRun).where(EvaluationRun.id == run_id)
    )
    if not run_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Evaluation run not found")

    query = (
        select(EvaluationResult)
        .where(EvaluationResult.evaluation_run_id == run_id)
        .options(
            selectinload(EvaluationResult.model),
            selectinload(EvaluationResult.test_case),
        )
    )

    if model_id:
        query = query.where(EvaluationResult.model_id == model_id)

    result = await db.execute(query)
    rows = result.scalars().all()

    # Apply category filter (post-load since it's a joined field)
    responses = []
    for r in rows:
        tc_category = r.test_case.category if r.test_case else None
        if category and tc_category != category:
            continue

        responses.append(
            EvaluationResultResponse(
                id=r.id,
                evaluation_run_id=r.evaluation_run_id,
                model_id=r.model_id,
                test_case_id=r.test_case_id,
                prompt=r.prompt,
                response=r.response,
                relevance_score=float(r.relevance_score) if r.relevance_score is not None else None,
                correctness_score=float(r.correctness_score) if r.correctness_score is not None else None,
                reasoning_score=float(r.reasoning_score) if r.reasoning_score is not None else None,
                factuality_score=float(r.factuality_score) if r.factuality_score is not None else None,
                safety_score=float(r.safety_score) if r.safety_score is not None else None,
                hallucination_score=float(r.hallucination_score) if r.hallucination_score is not None else None,
                total_score=float(r.total_score) if r.total_score is not None else None,
                latency_ms=r.latency_ms,
                input_tokens=r.input_tokens,
                output_tokens=r.output_tokens,
                estimated_cost=float(r.estimated_cost) if r.estimated_cost is not None else None,
                created_at=r.created_at,
                model_display_name=r.model.display_name if r.model else None,
                model_provider=r.model.provider if r.model else None,
                test_case_category=tc_category,
                test_case_question=r.test_case.question if r.test_case else None,
            )
        )

    return responses
