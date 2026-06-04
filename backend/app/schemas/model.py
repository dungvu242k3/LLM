"""Pydantic schemas for LLM Model CRUD operations."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ModelCreate(BaseModel):
    """Schema for creating a new model."""
    provider: str = Field(..., description="Provider name: nine_router, openrouter, openai, gemini, claude")
    model_id: str = Field(..., description="Provider-specific model identifier")
    display_name: str = Field(..., description="Human-readable display name")
    context_length: Optional[int] = Field(None, description="Maximum context window")
    input_price_per_1m_tokens: Optional[float] = Field(None, description="Cost per 1M input tokens (USD)")
    output_price_per_1m_tokens: Optional[float] = Field(None, description="Cost per 1M output tokens (USD)")
    is_active: bool = True


class ModelUpdate(BaseModel):
    """Schema for updating a model."""
    provider: Optional[str] = None
    model_id: Optional[str] = None
    display_name: Optional[str] = None
    context_length: Optional[int] = None
    input_price_per_1m_tokens: Optional[float] = None
    output_price_per_1m_tokens: Optional[float] = None
    is_active: Optional[bool] = None


class ModelResponse(BaseModel):
    """Schema for model API responses."""
    id: str
    provider: str
    model_id: str
    display_name: str
    context_length: Optional[int] = None
    input_price_per_1m_tokens: Optional[float] = None
    output_price_per_1m_tokens: Optional[float] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
