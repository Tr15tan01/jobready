import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class CandidateProgress(Base, UUIDPKMixin, TimestampMixin):
    """Rolling snapshot of a candidate's readiness over time (section 21)."""
    __tablename__ = "candidate_progress"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # DateTime(timezone=True) is required: every value written here is
    # timezone-aware (datetime.now(timezone.utc)), and a bare TIMESTAMP
    # WITHOUT TIME ZONE column rejects those with a DataError.
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    interview_session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="SET NULL"), nullable=True
    )
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    technical_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    communication_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    structure_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    language_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    conciseness_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recurring_weaknesses: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)


class LearningPlan(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "learning_plans"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    job_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    items: Mapped[list["LearningItem"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan", order_by="LearningItem.day_number"
    )


class LearningItem(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "learning_items"

    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("learning_plans.id", ondelete="CASCADE"), nullable=False
    )
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    item_type: Mapped[str] = mapped_column(String(32), nullable=False)  # practice|reading|mock_interview
    is_complete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    plan: Mapped["LearningPlan"] = relationship(back_populates="items")


class AIRequest(Base, UUIDPKMixin, TimestampMixin):
    """Every AI call is logged for cost tracking (section 27)."""
    __tablename__ = "ai_requests"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    feature: Mapped[str] = mapped_column(String(64), nullable=False)  # resume_extraction|job_matching|...
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    input_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    estimated_cost_usd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    cache_hit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="success", nullable=False)  # success|error


class AICache(Base, UUIDPKMixin, TimestampMixin):
    """Deterministic-result cache, keyed by a hash of (feature + input).
    Checked before every AI call to avoid regenerating unchanged results
    (section 25) — e.g. resume/job extraction, embeddings."""
    __tablename__ = "ai_cache"

    cache_key: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    feature: Mapped[str] = mapped_column(String(64), nullable=False)
    input_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    result: Mapped[dict] = mapped_column(JSONB, nullable=False)
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
