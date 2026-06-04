"""API routes for test case CRUD and import operations."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import TestCase
from app.schemas.test_case import TestCaseCreate, TestCaseResponse, TestCaseImport

router = APIRouter(prefix="/api/test-cases", tags=["test-cases"])


@router.get("", response_model=list[TestCaseResponse])
async def list_test_cases(
    category: str | None = None,
    language: str | None = None,
    difficulty: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all test cases with optional filters."""
    query = select(TestCase).order_by(TestCase.created_at.desc())
    if category:
        query = query.where(TestCase.category == category)
    if language:
        query = query.where(TestCase.language == language)
    if difficulty:
        query = query.where(TestCase.difficulty == difficulty)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{test_case_id}", response_model=TestCaseResponse)
async def get_test_case(test_case_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single test case by ID."""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    tc = result.scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    return tc


@router.post("", response_model=TestCaseResponse, status_code=201)
async def create_test_case(data: TestCaseCreate, db: AsyncSession = Depends(get_db)):
    """Create a new test case."""
    tc = TestCase(**data.model_dump())
    db.add(tc)
    await db.flush()
    await db.refresh(tc)
    return tc


@router.post("/import", response_model=list[TestCaseResponse], status_code=201)
async def import_test_cases(data: TestCaseImport, db: AsyncSession = Depends(get_db)):
    """Bulk import test cases from JSON."""
    created = []
    for tc_data in data.test_cases:
        tc = TestCase(**tc_data.model_dump())
        db.add(tc)
        created.append(tc)

    await db.flush()
    for tc in created:
        await db.refresh(tc)

    return created


@router.delete("/{test_case_id}", status_code=204)
async def delete_test_case(test_case_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a test case."""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    tc = result.scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    await db.delete(tc)
