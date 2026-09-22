import uuid
from typing import Optional

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin
from app.core.config import settings

# pgvector is optional — only imported/used when EMBEDDINGS_ENABLED=1 so the
# app works fully without the extension installed (section 13).
if settings.EMBEDDINGS_ENABLED:
    from pgvector.sqlalchemy import Vector
    # Driven by config so the embedding model can change without editing
    # code. Must match GEMINI_EMBEDDING_DIM — changing it after vectors
    # are stored requires an Alembic migration plus re-embedding.
    EMBEDDING_DIM = settings.GEMINI_EMBEDDING_DIM


class Job(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "jobs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    seniority: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    raw_description: Mapped[str] = mapped_column(Text, nullable=False)
    # Hash of raw_description so we never re-run extraction/embeddings on
    # unchanged text (AI cost control, section 25).
    description_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    if settings.EMBEDDINGS_ENABLED:
        embedding = mapped_column(Vector(EMBEDDING_DIM), nullable=True)

    requirements: Mapped[Optional["JobRequirement"]] = relationship(
        back_populates="job", uselist=False, cascade="all, delete-orphan"
    )
    matches: Mapped[list["JobMatch"]] = relationship(back_populates="job", cascade="all, delete-orphan")


class JobRequirement(Base, UUIDPKMixin, TimestampMixin):
    """Structured extraction of a job's requirements (section 11).
    Cached against Job.description_hash so it's only regenerated when the
    underlying description text actually changes."""
    __tablename__ = "job_requirements"

    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    required_skills: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    preferred_skills: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    experience_requirements: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    education_requirements: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    responsibilities: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    languages: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    technologies: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    other_qualifications: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    job: Mapped["Job"] = relationship(back_populates="requirements")


class JobMatch(Base, UUIDPKMixin, TimestampMixin):
    """Transparent, weighted match score (section 12) — never a single
    opaque embedding-similarity number."""
    __tablename__ = "job_matches"

    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )
    resume_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resume_versions.id", ondelete="CASCADE"), nullable=False
    )
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    required_requirements_score: Mapped[float] = mapped_column(Float, nullable=False)
    experience_score: Mapped[float] = mapped_column(Float, nullable=False)
    technical_skills_score: Mapped[float] = mapped_column(Float, nullable=False)
    responsibilities_score: Mapped[float] = mapped_column(Float, nullable=False)
    preferred_score: Mapped[float] = mapped_column(Float, nullable=False)
    strong_matches: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    gaps: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    partial_matches: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    job: Mapped["Job"] = relationship(back_populates="matches")
