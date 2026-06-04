"""API routes for report generation and export."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.report_service import (
    generate_csv,
    generate_json_report,
    generate_markdown_report,
)

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/{evaluation_id}/csv")
async def export_csv(evaluation_id: str, db: AsyncSession = Depends(get_db)):
    """Export evaluation results as CSV."""
    csv_content = await generate_csv(db, evaluation_id)
    if csv_content is None:
        raise HTTPException(status_code=404, detail="Evaluation not found or no results")
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=eval_{evaluation_id[:8]}.csv"},
    )


@router.get("/{evaluation_id}/json")
async def export_json(evaluation_id: str, db: AsyncSession = Depends(get_db)):
    """Export evaluation results as structured JSON."""
    report = await generate_json_report(db, evaluation_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Evaluation not found or no results")
    return JSONResponse(content=report)


@router.get("/{evaluation_id}/markdown")
async def export_markdown(evaluation_id: str, db: AsyncSession = Depends(get_db)):
    """Export evaluation results as Markdown report."""
    md_content = await generate_markdown_report(db, evaluation_id)
    if md_content is None:
        raise HTTPException(status_code=404, detail="Evaluation not found or no results")
    return PlainTextResponse(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=eval_{evaluation_id[:8]}_report.md"},
    )
