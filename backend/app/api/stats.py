"""API routes for dashboard statistics and aggregations."""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Model, TestCase, EvaluationRun, EvaluationResult

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db)):
    """Get dashboard overview statistics."""
    # Count models
    models_count = (await db.execute(select(func.count()).select_from(Model))).scalar() or 0

    # Count test cases
    test_cases_count = (await db.execute(select(func.count()).select_from(TestCase))).scalar() or 0

    # Count evaluation runs
    runs_count = (await db.execute(select(func.count()).select_from(EvaluationRun))).scalar() or 0

    # Best model by average total score
    best_model_query = (
        select(
            Model.display_name,
            func.avg(EvaluationResult.total_score).label("avg_score"),
        )
        .join(EvaluationResult, EvaluationResult.model_id == Model.id)
        .where(EvaluationResult.total_score.is_not(None))
        .group_by(Model.id, Model.display_name)
        .order_by(desc("avg_score"))
        .limit(1)
    )
    best_result = (await db.execute(best_model_query)).first()
    best_model = {"name": best_result[0], "score": round(float(best_result[1]), 2)} if best_result else None

    # Cheapest model by total estimated cost
    cheapest_query = (
        select(
            Model.display_name,
            func.sum(EvaluationResult.estimated_cost).label("total_cost"),
        )
        .join(EvaluationResult, EvaluationResult.model_id == Model.id)
        .where(EvaluationResult.estimated_cost.is_not(None))
        .group_by(Model.id, Model.display_name)
        .order_by("total_cost")
        .limit(1)
    )
    cheapest_result = (await db.execute(cheapest_query)).first()
    cheapest_model = {"name": cheapest_result[0], "cost": round(float(cheapest_result[1]), 6)} if cheapest_result else None

    # Fastest model by average latency
    fastest_query = (
        select(
            Model.display_name,
            func.avg(EvaluationResult.latency_ms).label("avg_latency"),
        )
        .join(EvaluationResult, EvaluationResult.model_id == Model.id)
        .where(EvaluationResult.latency_ms.is_not(None))
        .group_by(Model.id, Model.display_name)
        .order_by("avg_latency")
        .limit(1)
    )
    fastest_result = (await db.execute(fastest_query)).first()
    fastest_model = {"name": fastest_result[0], "latency_ms": round(float(fastest_result[1]))} if fastest_result else None

    # Recent evaluation runs
    recent_query = (
        select(EvaluationRun)
        .order_by(EvaluationRun.created_at.desc())
        .limit(5)
    )
    recent_result = await db.execute(recent_query)
    recent_runs = [
        {
            "id": r.id,
            "name": r.name,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in recent_result.scalars().all()
    ]

    return {
        "models_count": models_count,
        "test_cases_count": test_cases_count,
        "runs_count": runs_count,
        "best_model": best_model,
        "cheapest_model": cheapest_model,
        "fastest_model": fastest_model,
        "recent_runs": recent_runs,
    }


@router.get("/model-comparison")
async def get_model_comparison(db: AsyncSession = Depends(get_db)):
    """Get aggregated scores per model for comparison charts."""
    query = (
        select(
            Model.id,
            Model.display_name,
            Model.provider,
            func.avg(EvaluationResult.relevance_score).label("avg_relevance"),
            func.avg(EvaluationResult.correctness_score).label("avg_correctness"),
            func.avg(EvaluationResult.reasoning_score).label("avg_reasoning"),
            func.avg(EvaluationResult.factuality_score).label("avg_factuality"),
            func.avg(EvaluationResult.safety_score).label("avg_safety"),
            func.avg(EvaluationResult.hallucination_score).label("avg_hallucination"),
            func.avg(EvaluationResult.total_score).label("avg_total"),
            func.avg(EvaluationResult.latency_ms).label("avg_latency"),
            func.sum(EvaluationResult.estimated_cost).label("total_cost"),
            func.count(EvaluationResult.id).label("total_tests"),
        )
        .join(EvaluationResult, EvaluationResult.model_id == Model.id)
        .group_by(Model.id, Model.display_name, Model.provider)
        .order_by(desc("avg_total"))
    )

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "model_id": row.id,
            "display_name": row.display_name,
            "provider": row.provider,
            "avg_relevance": round(float(row.avg_relevance), 2) if row.avg_relevance else None,
            "avg_correctness": round(float(row.avg_correctness), 2) if row.avg_correctness else None,
            "avg_reasoning": round(float(row.avg_reasoning), 2) if row.avg_reasoning else None,
            "avg_factuality": round(float(row.avg_factuality), 2) if row.avg_factuality else None,
            "avg_safety": round(float(row.avg_safety), 2) if row.avg_safety else None,
            "avg_hallucination": round(float(row.avg_hallucination), 2) if row.avg_hallucination else None,
            "avg_total": round(float(row.avg_total), 2) if row.avg_total else None,
            "avg_latency_ms": round(float(row.avg_latency)) if row.avg_latency else None,
            "total_cost": round(float(row.total_cost), 6) if row.total_cost else None,
            "total_tests": row.total_tests,
        }
        for row in rows
    ]


@router.get("/category-breakdown")
async def get_category_breakdown(db: AsyncSession = Depends(get_db)):
    """Get scores per category per model for detailed comparison."""
    query = (
        select(
            Model.display_name,
            TestCase.category,
            func.avg(EvaluationResult.total_score).label("avg_score"),
            func.count(EvaluationResult.id).label("test_count"),
        )
        .join(EvaluationResult, EvaluationResult.model_id == Model.id)
        .join(TestCase, EvaluationResult.test_case_id == TestCase.id)
        .where(EvaluationResult.total_score.is_not(None))
        .group_by(Model.display_name, TestCase.category)
        .order_by(Model.display_name, TestCase.category)
    )

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "model": row.display_name,
            "category": row.category,
            "avg_score": round(float(row.avg_score), 2),
            "test_count": row.test_count,
        }
        for row in rows
    ]
