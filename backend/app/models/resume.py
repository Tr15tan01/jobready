import uuid
from datetime import date
from typing import Optional

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin
from app.core.config import settings


class CandidateProfile(Base, UUIDPKMixin, TimestampMixin):
    """Canonical, structured candidate data — the source of truth AI
    suggestions must be traceable back to (anti-hallucination, section 43)."""
    __tablename__ = "candidate_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    headline: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    links: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # {linkedin, github, portfolio}

    work_experience: Mapped[list["WorkExperience"]] = relationship(
        back_populates="candidate", cascade="all, delete-orphan"
    )
    education: Mapped[list["Education"]] = relationship(
        back_populates="candidate", cascade="all, delete-orphan"
    )


class Resume(Base, UUIDPKMixin, TimestampMixin):
    """An uploaded/created resume. Original file is NOT retained after
    extraction (section 9) — only the extracted text/structured data."""
    __tablename__ = "resumes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), default="My Resume", nullable=False)
    source: Mapped[str] = mapped_column(String(32), default="upload", nullable=False)  # upload|builder
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    versions: Mapped[list["ResumeVersion"]] = relationship(
        back_populates="resume", cascade="all, delete-orphan", order_by="ResumeVersion.version_number"
    )


class ResumeVersion(Base, UUIDPKMixin, TimestampMixin):
    """Structured, editable snapshot of a resume (supports multiple
    versions / tailoring to a specific job — section 10)."""
    __tablename__ = "resume_versions"

    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # e.g. "Tailored: Acme SWE"
    tailored_for_job_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True
    )
    template: Mapped[str] = mapped_column(String(64), default="minimal", nullable=False)
    # Structured content (sections, ordering, wording) — flexible AI output
    # genuinely benefits from JSONB here (section 2).
    content: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    resume: Mapped["Resume"] = relationship(back_populates="versions")


class Skill(Base, UUIDPKMixin, TimestampMixin):
    """Canonical skill taxonomy, shared across candidates and jobs."""
    __tablename__ = "skills"

    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # language|framework|tool|soft


class CandidateSkill(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "candidate_skills"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False
    )
    proficiency: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)  # beginner|intermediate|advanced
    years_experience: Mapped[Optional[float]] = mapped_column(nullable=True)


class WorkExperience(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "work_experience"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False
    )
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    technologies: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    candidate: Mapped["CandidateProfile"] = relationship(back_populates="work_experience")


class Education(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "education"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False
    )
    institution: Mapped[str] = mapped_column(String(255), nullable=False)
    degree: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    field_of_study: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    candidate: Mapped["CandidateProfile"] = relationship(back_populates="education")
