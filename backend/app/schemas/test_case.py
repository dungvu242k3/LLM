"""Pydantic schemas for Test Case CRUD operations."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TestCaseCreate(BaseModel):
    """Schema for creating a new test case."""
    category: str = Field(..., description="Category: reasoning, math, code, vietnamese, factuality, safety, etc.")
    question: str = Field(..., description="The test question/prompt")
    expected_answer: Optional[str] = Field(None, description="Reference/expected answer")
    difficulty: Optional[str] = Field(None, description="Difficulty: easy, medium, hard")
    language: str = Field("en", description="Language code: en, vi, etc.")
    tags: Optional[list[str]] = Field(None, description="Tags for filtering")
    rubric: Optional[dict] = Field(None, description="Scoring rubric for LLM judge")


class TestCaseResponse(BaseModel):
    """Schema for test case API responses."""
    id: str
    category: str
    question: str
    expected_answer: Optional[str] = None
    difficulty: Optional[str] = None
    language: str
    tags: Optional[list[str]] = None
    rubric: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TestCaseImport(BaseModel):
    """Schema for importing multiple test cases."""
    test_cases: list[TestCaseCreate]
