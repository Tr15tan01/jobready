import uuid
from typing import Optional

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class InterviewSession(Base, UUIDPKMixin, TimestampMixin):
    """A single practice interview. Per section 15 / 44: NEVER stores video
    files — only transcript, metrics, scores and timestamps."""
    __tablename__ = "interview_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    job_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True
    )
    mode: Mapped[str] = mapped_column(String(32), nullable=False)  # behavioral|technical|hr|general|system_design|custom
    difficulty: Mapped[str] = mapped_column(String(16), default="medium", nullable=False)  # easy|medium|hard
    input_mode: Mapped[str] = mapped_column(String(16), default="text", nullable=False)  # text|voice|video
    # Distinguishes a job-interview session from a general Speech Practice
    # session (persuasive/impromptu/etc.) — both reuse the same question/
    # answer/evaluation/metrics tables since the flow is identical.
    session_type: Mapped[str] = mapped_column(String(16), default="interview", nullable=False)  # interview|speech_practice
    camera_enabled: Mapped[bool] = mapped_column(default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="in_progress", nullable=False)  # in_progress|completed|abandoned
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    overall_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    communication_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    technical_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    structure_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    questions: Mapped[list["InterviewQuestion"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="InterviewQuestion.order_index"
    )


class InterviewQuestion(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "interview_questions"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    # Generated lazily based on prior answers (section 14) rather than all
    # up-front, to avoid unnecessary AI calls.
    #
    # use_alter=True is required: interview_answers.question_id points here,
    # and this column points back at interview_answers — a mutual dependency
    # that leaves no valid CREATE TABLE ordering. use_alter tells SQLAlchemy
    # to add this constraint via a separate ALTER TABLE once both tables
    # exist. The named constraint is needed so Alembic can drop it cleanly.
    generated_from_answer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "interview_answers.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_interview_questions_generated_from_answer_id",
        ),
        nullable=True,
    )

    session: Mapped["InterviewSession"] = relationship(back_populates="questions")
    answer: Mapped[Optional["InterviewAnswer"]] = relationship(
        back_populates="question", uselist=False, cascade="all, delete-orphan",
        foreign_keys="InterviewAnswer.question_id",
    )


class InterviewAnswer(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "interview_answers"

    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_questions.id", ondelete="CASCADE"), nullable=False
    )
    transcript: Mapped[str] = mapped_column(Text, nullable=False)
    input_mode: Mapped[str] = mapped_column(String(16), default="text", nullable=False)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    retry_of_answer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_answers.id", ondelete="SET NULL"), nullable=True
    )

    question: Mapped["InterviewQuestion"] = relationship(
        back_populates="answer", foreign_keys=[question_id]
    )
    evaluation: Mapped[Optional["AnswerEvaluation"]] = relationship(
        back_populates="answer", uselist=False, cascade="all, delete-orphan"
    )
    speech_metrics: Mapped[Optional["SpeechMetrics"]] = relationship(
        back_populates="answer", uselist=False, cascade="all, delete-orphan"
    )
    visual_metrics: Mapped[Optional["VisualMetrics"]] = relationship(
        back_populates="answer", uselist=False, cascade="all, delete-orphan"
    )


class AnswerEvaluation(Base, UUIDPKMixin, TimestampMixin):
    """Structured AI evaluation — validated via Pydantic schema before
    storage (section 18), never free-form scoring text."""
    __tablename__ = "answer_evaluations"

    answer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_answers.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)
    strengths: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    improvements: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    missing_points: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    suggested_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    practice_focus: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    criteria_breakdown: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    answer: Mapped["InterviewAnswer"] = relationship(back_populates="evaluation")


class SpeechMetrics(Base, UUIDPKMixin, TimestampMixin):
    """Derived speech metrics only — never raw audio (section 17)."""
    __tablename__ = "speech_metrics"

    answer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_answers.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    words_per_minute: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    filler_word_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    pause_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_pause_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    clarity_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    grammar_notes: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    vocabulary_notes: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)

    answer: Mapped["InterviewAnswer"] = relationship(back_populates="speech_metrics")


class VisualMetrics(Base, UUIDPKMixin, TimestampMixin):
    """Derived, observable visual-coaching signals only (section 16/44).
    Computed client-side via MediaPipe; never psychological conclusions."""
    __tablename__ = "visual_metrics"

    answer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_answers.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    face_visible_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    eye_contact_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    head_movement_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    posture_notes: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    hand_movement_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    answer: Mapped["InterviewAnswer"] = relationship(back_populates="visual_metrics")
