"""SQLAlchemy ORM models for the LLM Evaluation Dashboard."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> str:
    return str(uuid.uuid4())


class Model(Base):
    """LLM model configuration."""

    __tablename__ = "models"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model_id: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    context_length: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    input_price_per_1m_tokens: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 4), nullable=True
    )
    output_price_per_1m_tokens: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 4), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )

    # Relationships
    evaluation_results: Mapped[list["EvaluationResult"]] = relationship(
        back_populates="model"
    )


class TestCase(Base):
    """Benchmark test case / question."""

    __tablename__ = "test_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    expected_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    difficulty: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    language: Mapped[str] = mapped_column(String(20), default="en")
    tags: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    rubric: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )

    # Relationships
    evaluation_results: Mapped[list["EvaluationResult"]] = relationship(
        back_populates="test_case"
    )


class EvaluationRun(Base):
    """A single benchmark run session."""

    __tablename__ = "evaluation_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )

    # Relationships
    results: Mapped[list["EvaluationResult"]] = relationship(
        back_populates="evaluation_run", cascade="all, delete-orphan"
    )


class EvaluationResult(Base):
    """Individual test result for one model on one test case."""

    __tablename__ = "evaluation_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    evaluation_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("evaluation_runs.id"), nullable=False
    )
    model_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("models.id"), nullable=False
    )
    test_case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("test_cases.id"), nullable=False
    )

    # Prompt & response
    prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Scores (1-5 scale, or 0/1 for rule-based)
    relevance_score: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    correctness_score: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    reasoning_score: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    factuality_score: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    safety_score: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    hallucination_score: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    total_score: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2), nullable=True
    )

    # Performance metrics
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    input_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    estimated_cost: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 6), nullable=True
    )

    # Raw data
    raw_response: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )

    # Relationships
    evaluation_run: Mapped["EvaluationRun"] = relationship(back_populates="results")
    model: Mapped["Model"] = relationship(back_populates="evaluation_results")
    test_case: Mapped["TestCase"] = relationship(back_populates="evaluation_results")
