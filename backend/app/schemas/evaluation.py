"""Pydantic schemas for Evaluation operations."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class EvaluationRunCreate(BaseModel):
    """Schema for creating a new evaluation run."""
    name: str = Field(..., description="Name for this evaluation run")
    model_ids: list[str] = Field(..., description="List of model IDs to evaluate")
    test_case_ids: Optional[list[str]] = Field(None, description="Specific test case IDs, or None for all")
    category_filter: Optional[str] = Field(None, description="Filter test cases by category")
    temperature: float = Field(0.2, ge=0, le=2)
    max_tokens: int = Field(1024, ge=1, le=16384)
    evaluator_type: str = Field("rule_based", description="Evaluator: rule_based, llm_judge, both")


class EvaluationRunResponse(BaseModel):
    """Schema for evaluation run API responses."""
    id: str
    name: str
    status: str
    config: Optional[dict] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    total_results: Optional[int] = None

    model_config = {"from_attributes": True}


class EvaluationResultResponse(BaseModel):
    """Schema for individual evaluation result."""
    id: str
    evaluation_run_id: str
    model_id: str
    test_case_id: str
    prompt: Optional[str] = None
    response: Optional[str] = None
    relevance_score: Optional[float] = None
    correctness_score: Optional[float] = None
    reasoning_score: Optional[float] = None
    factuality_score: Optional[float] = None
    safety_score: Optional[float] = None
    hallucination_score: Optional[float] = None
    total_score: Optional[float] = None
    latency_ms: Optional[int] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    estimated_cost: Optional[float] = None
    created_at: datetime

    # Joined fields
    model_display_name: Optional[str] = None
    model_provider: Optional[str] = None
    test_case_category: Optional[str] = None
    test_case_question: Optional[str] = None

    model_config = {"from_attributes": True}


class EvaluationProgress(BaseModel):
    """Schema for evaluation progress updates."""
    evaluation_run_id: str
    status: str
    current: int
    total: int
    current_model: Optional[str] = None
    current_category: Optional[str] = None
