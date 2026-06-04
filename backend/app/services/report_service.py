"""Report service — generates CSV, JSON, and Markdown reports from evaluation results."""

import csv
import io
import json
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import EvaluationRun, EvaluationResult, Model, TestCase


async def _get_results_with_joins(
    db: AsyncSession, evaluation_run_id: str
) -> tuple[Optional[EvaluationRun], list[dict]]:
    """Fetch evaluation run with all results joined to models and test cases."""
    run_query = select(EvaluationRun).where(EvaluationRun.id == evaluation_run_id)
    run_result = await db.execute(run_query)
    run = run_result.scalar_one_or_none()

    if not run:
        return None, []

    results_query = (
        select(EvaluationResult)
        .where(EvaluationResult.evaluation_run_id == evaluation_run_id)
        .options(
            selectinload(EvaluationResult.model),
            selectinload(EvaluationResult.test_case),
        )
    )
    results = await db.execute(results_query)
    rows = results.scalars().all()

    data = []
    for r in rows:
        data.append({
            "model": r.model.display_name if r.model else "Unknown",
            "provider": r.model.provider if r.model else "Unknown",
            "category": r.test_case.category if r.test_case else "Unknown",
            "question": r.test_case.question if r.test_case else "",
            "expected_answer": r.test_case.expected_answer if r.test_case else "",
            "response": r.response or "",
            "relevance_score": float(r.relevance_score) if r.relevance_score is not None else None,
            "correctness_score": float(r.correctness_score) if r.correctness_score is not None else None,
            "reasoning_score": float(r.reasoning_score) if r.reasoning_score is not None else None,
            "factuality_score": float(r.factuality_score) if r.factuality_score is not None else None,
            "safety_score": float(r.safety_score) if r.safety_score is not None else None,
            "hallucination_score": float(r.hallucination_score) if r.hallucination_score is not None else None,
            "total_score": float(r.total_score) if r.total_score is not None else None,
            "latency_ms": r.latency_ms,
            "input_tokens": r.input_tokens,
            "output_tokens": r.output_tokens,
            "estimated_cost": float(r.estimated_cost) if r.estimated_cost is not None else None,
        })

    return run, data


async def generate_csv(db: AsyncSession, evaluation_run_id: str) -> Optional[str]:
    """Generate CSV string from evaluation results."""
    run, data = await _get_results_with_joins(db, evaluation_run_id)
    if not run or not data:
        return None

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)
    return output.getvalue()


async def generate_json_report(db: AsyncSession, evaluation_run_id: str) -> Optional[dict]:
    """Generate JSON report from evaluation results."""
    run, data = await _get_results_with_joins(db, evaluation_run_id)
    if not run or not data:
        return None

    # Aggregate by model
    model_stats = {}
    for row in data:
        model_name = row["model"]
        if model_name not in model_stats:
            model_stats[model_name] = {
                "provider": row["provider"],
                "total_tests": 0,
                "scores": [],
                "total_latency": 0,
                "total_cost": 0.0,
            }
        stats = model_stats[model_name]
        stats["total_tests"] += 1
        if row["total_score"] is not None:
            stats["scores"].append(row["total_score"])
        if row["latency_ms"]:
            stats["total_latency"] += row["latency_ms"]
        if row["estimated_cost"]:
            stats["total_cost"] += row["estimated_cost"]

    summary = {}
    for model_name, stats in model_stats.items():
        avg_score = sum(stats["scores"]) / len(stats["scores"]) if stats["scores"] else 0
        avg_latency = stats["total_latency"] / stats["total_tests"] if stats["total_tests"] else 0
        summary[model_name] = {
            "provider": stats["provider"],
            "total_tests": stats["total_tests"],
            "average_score": round(avg_score, 2),
            "average_latency_ms": round(avg_latency),
            "total_cost_usd": round(stats["total_cost"], 6),
        }

    return {
        "evaluation_run": {
            "id": run.id,
            "name": run.name,
            "status": run.status,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        },
        "summary": summary,
        "results": data,
    }


async def generate_markdown_report(db: AsyncSession, evaluation_run_id: str) -> Optional[str]:
    """Generate a Markdown report from evaluation results."""
    json_report = await generate_json_report(db, evaluation_run_id)
    if not json_report:
        return None

    run_info = json_report["evaluation_run"]
    summary = json_report["summary"]
    results = json_report["results"]

    lines = [
        f"# LLM Evaluation Report",
        "",
        f"## 1. Overview",
        f"- **Run Name:** {run_info['name']}",
        f"- **Status:** {run_info['status']}",
        f"- **Started:** {run_info['started_at'] or 'N/A'}",
        f"- **Completed:** {run_info['completed_at'] or 'N/A'}",
        f"- **Total Models:** {len(summary)}",
        f"- **Total Test Cases:** {sum(s['total_tests'] for s in summary.values())}",
        "",
        "## 2. Models Evaluated",
        "",
        "| Model | Provider | Tests | Avg Score | Avg Latency (ms) | Total Cost (USD) |",
        "|-------|----------|-------|-----------|-------------------|------------------|",
    ]

    for model_name, stats in sorted(summary.items(), key=lambda x: -x[1]["average_score"]):
        lines.append(
            f"| {model_name} | {stats['provider']} | {stats['total_tests']} | "
            f"{stats['average_score']:.2f} | {stats['average_latency_ms']} | "
            f"${stats['total_cost_usd']:.6f} |"
        )

    lines.extend([
        "",
        "## 3. Results by Category",
        "",
    ])

    # Group by category
    categories = {}
    for r in results:
        cat = r["category"]
        if cat not in categories:
            categories[cat] = {}
        model = r["model"]
        if model not in categories[cat]:
            categories[cat][model] = []
        if r["total_score"] is not None:
            categories[cat][model].append(r["total_score"])

    for cat, models in sorted(categories.items()):
        lines.append(f"### {cat.title()}")
        lines.append("")
        lines.append("| Model | Avg Score | Tests |")
        lines.append("|-------|-----------|-------|")
        for model_name, scores in sorted(models.items(), key=lambda x: -(sum(x[1]) / len(x[1]) if x[1] else 0)):
            avg = sum(scores) / len(scores) if scores else 0
            lines.append(f"| {model_name} | {avg:.2f} | {len(scores)} |")
        lines.append("")

    # Recommendations
    lines.extend([
        "## 4. Recommendations",
        "",
    ])

    if summary:
        best_score = max(summary.items(), key=lambda x: x[1]["average_score"])
        cheapest = min(summary.items(), key=lambda x: x[1]["total_cost_usd"])
        fastest = min(summary.items(), key=lambda x: x[1]["average_latency_ms"])

        lines.append(f"- **Best Overall:** {best_score[0]} (avg score: {best_score[1]['average_score']:.2f})")
        lines.append(f"- **Most Cost-Effective:** {cheapest[0]} (total cost: ${cheapest[1]['total_cost_usd']:.6f})")
        lines.append(f"- **Fastest:** {fastest[0]} (avg latency: {fastest[1]['average_latency_ms']}ms)")

    lines.extend(["", "---", f"*Report generated automatically by LLM Evaluation Dashboard*"])

    return "\n".join(lines)
