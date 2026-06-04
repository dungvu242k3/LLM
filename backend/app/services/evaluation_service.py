import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models import Model, TestCase, EvaluationRun, EvaluationResult
from app.providers.registry import get_provider
from app.evaluators.rule_based import evaluate_rule_based
from app.evaluators.llm_judge import evaluate_with_llm_judge
from app.evaluators.cost import calculate_cost
from app.schemas.evaluation import EvaluationRunCreate

logger = logging.getLogger(__name__)


async def evaluate_single_task(
    run_id: str,
    model: Model,
    tc: TestCase,
    config: EvaluationRunCreate,
    sem: asyncio.Semaphore,
    db_lock: asyncio.Lock,
    judge_model: Optional[Model] = None,
):
    """Run evaluation for a single model and test case combination, with rate limit semaphore."""
    async with sem:
        provider = get_provider(model.provider)
        messages = [{"role": "user", "content": tc.question}]

        try:
            llm_response = await provider.generate(
                model=model.model_id,
                messages=messages,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
            )

            # Evaluate
            scores = {}
            if config.evaluator_type in ("rule_based", "both"):
                scores = evaluate_rule_based(
                    response=llm_response.text,
                    expected_answer=tc.expected_answer,
                    category=tc.category,
                )

            judge_response = None
            if config.evaluator_type in ("llm_judge", "both"):
                judge_scores, judge_response = await evaluate_with_llm_judge(
                    question=tc.question,
                    expected_answer=tc.expected_answer,
                    model_response=llm_response.text,
                )
                # Merge: LLM judge scores take priority if available
                for key, value in judge_scores.items():
                    if value is not None:
                        scores[key] = value

            # Calculate model cost
            estimated_cost = calculate_cost(
                input_tokens=llm_response.input_tokens,
                output_tokens=llm_response.output_tokens,
                input_price_per_1m=float(model.input_price_per_1m_tokens) if model.input_price_per_1m_tokens else None,
                output_price_per_1m=float(model.output_price_per_1m_tokens) if model.output_price_per_1m_tokens else None,
            )

            # Add judge cost if judge was executed
            if judge_response and judge_model:
                judge_cost = calculate_cost(
                    input_tokens=judge_response.input_tokens,
                    output_tokens=judge_response.output_tokens,
                    input_price_per_1m=float(judge_model.input_price_per_1m_tokens) if judge_model.input_price_per_1m_tokens else None,
                    output_price_per_1m=float(judge_model.output_price_per_1m_tokens) if judge_model.output_price_per_1m_tokens else None,
                )
                if judge_cost is not None:
                    if estimated_cost is None:
                        estimated_cost = judge_cost
                    else:
                        estimated_cost = round(estimated_cost + judge_cost, 6)

            # Save result in a separate session
            async with db_lock:
                async with async_session() as session:
                    eval_result = EvaluationResult(
                        evaluation_run_id=run_id,
                        model_id=model.id,
                        test_case_id=tc.id,
                        prompt=tc.question,
                        response=llm_response.text,
                        relevance_score=scores.get("relevance_score"),
                        correctness_score=scores.get("correctness_score"),
                        reasoning_score=scores.get("reasoning_score"),
                        factuality_score=scores.get("factuality_score"),
                        safety_score=scores.get("safety_score"),
                        hallucination_score=scores.get("hallucination_score"),
                        total_score=scores.get("total_score"),
                        latency_ms=llm_response.latency_ms,
                        input_tokens=llm_response.input_tokens,
                        output_tokens=llm_response.output_tokens,
                        estimated_cost=estimated_cost,
                        raw_response=llm_response.raw,
                    )
                    session.add(eval_result)
                    await session.commit()

        except Exception as e:
            logger.error(
                f"Error evaluating {model.display_name} on {tc.id}: {e}"
            )
            # Save error result in a separate session
            async with db_lock:
                async with async_session() as session:
                    eval_result = EvaluationResult(
                        evaluation_run_id=run_id,
                        model_id=model.id,
                        test_case_id=tc.id,
                        prompt=tc.question,
                        response=f"ERROR: {str(e)}",
                        total_score=0.0,
                    )
                    session.add(eval_result)
                    await session.commit()


async def run_evaluation(
    db: AsyncSession, config: EvaluationRunCreate, run_id: Optional[str] = None
) -> EvaluationRun:
    """Run an evaluation: query models, send test cases, evaluate responses, save results.

    Args:
        db: Async database session.
        config: Evaluation run configuration.
        run_id: Optional ID of an existing EvaluationRun.

    Returns:
        The completed EvaluationRun with results.
    """
    # Create or retrieve the run record
    if run_id:
        result = await db.execute(select(EvaluationRun).where(EvaluationRun.id == run_id))
        run = result.scalar_one_or_none()
        if run:
            run.status = "running"
            run.started_at = datetime.now(timezone.utc)
            run.config = {
                "model_ids": config.model_ids,
                "temperature": config.temperature,
                "max_tokens": config.max_tokens,
                "evaluator_type": config.evaluator_type,
                "category_filter": config.category_filter,
            }
        else:
            run = EvaluationRun(
                id=run_id,
                name=config.name,
                status="running",
                config={
                    "model_ids": config.model_ids,
                    "temperature": config.temperature,
                    "max_tokens": config.max_tokens,
                    "evaluator_type": config.evaluator_type,
                    "category_filter": config.category_filter,
                },
                started_at=datetime.now(timezone.utc),
            )
            db.add(run)
    else:
        run = EvaluationRun(
            name=config.name,
            status="running",
            config={
                "model_ids": config.model_ids,
                "temperature": config.temperature,
                "max_tokens": config.max_tokens,
                "evaluator_type": config.evaluator_type,
                "category_filter": config.category_filter,
            },
            started_at=datetime.now(timezone.utc),
        )
        db.add(run)

    await db.commit()

    # Fetch models
    model_query = select(Model).where(
        Model.id.in_(config.model_ids),
        Model.is_active == True,
    )
    result = await db.execute(model_query)
    models = list(result.scalars().all())

    if not models:
        run.status = "failed"
        run.completed_at = datetime.now(timezone.utc)
        await db.commit()
        raise ValueError("No active models found for the given IDs.")

    # Fetch test cases
    tc_query = select(TestCase)
    if config.test_case_ids:
        tc_query = tc_query.where(TestCase.id.in_(config.test_case_ids))
    if config.category_filter:
        tc_query = tc_query.where(TestCase.category == config.category_filter)
    result = await db.execute(tc_query)
    test_cases = list(result.scalars().all())

    if not test_cases:
        run.status = "failed"
        run.completed_at = datetime.now(timezone.utc)
        await db.commit()
        raise ValueError("No test cases found matching the criteria.")

    # Fetch judge model for cost calculation
    judge_model_record = None
    if config.evaluator_type in ("llm_judge", "both"):
        from app.config import settings
        result = await db.execute(
            select(Model).where(
                Model.model_id == settings.judge_model,
                Model.provider == settings.judge_provider
            )
        )
        judge_model_record = result.scalars().first()

    total = len(models) * len(test_cases)
    logger.info(f"Starting parallel evaluation of {total} total tasks (Models: {len(models)}, Test Cases: {len(test_cases)})")

    # Set up semaphore and db lock for controlled concurrency and serialized database commits
    sem = asyncio.Semaphore(5)
    db_lock = asyncio.Lock()
    tasks = []
    run_id_str = str(run.id)
    for model in models:
        for tc in test_cases:
            tasks.append(evaluate_single_task(run_id_str, model, tc, config, sem, db_lock, judge_model_record))

    # Run tasks concurrently, returning exceptions to prevent aborting the run
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Log any exceptions
    for res in results:
        if isinstance(res, Exception):
            logger.error(f"Concurrent evaluation task raised an exception: {res}", exc_info=res)

    # Reload / update run record to ensure it commits successfully
    run_result = await db.execute(select(EvaluationRun).where(EvaluationRun.id == run_id_str))
    db_run = run_result.scalar_one_or_none()
    if db_run:
        db_run.status = "completed"
        db_run.completed_at = datetime.now(timezone.utc)
        await db.commit()
        return db_run
    else:
        # Fallback
        run.status = "completed"
        run.completed_at = datetime.now(timezone.utc)
        await db.commit()
        return run

