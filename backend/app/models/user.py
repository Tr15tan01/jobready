import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class Organization(Base, UUIDPKMixin, TimestampMixin):
    """Optional: lets JobReady later support B2B/team accounts."""
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="organization")


class User(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    # Nullable: users who sign in via Google OAuth have no local password hash.
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    locale: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Bumped on logout-everywhere and password change; embedded in every
    # issued token so revoking all sessions is just incrementing this.
    token_version: Mapped[int] = mapped_column(default=0, nullable=False)

    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True
    )
    organization: Mapped[Optional["Organization"]] = relationship(back_populates="users")

    # lazy="selectin" is required, not an optimization: `user.subscription`
    # is read on nearly every plan-gated endpoint, and the User loaded by
    # get_current_user isn't eager-loaded per-query. Under async SQLAlchemy
    # a lazy relationship access outside a greenlet context raises
    # MissingGreenlet, so this relationship must always load eagerly.
    # It's a 1:1 of a single small row, so the cost is one cheap extra query.
    subscription: Mapped[Optional["Subscription"]] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="selectin",
    )


class Subscription(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    plan: Mapped[str] = mapped_column(String(32), default="free", nullable=False)  # free|premium|pro
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)  # active|canceled|past_due
    # Billing provider stays replaceable (spec section 24) — store the
    # provider name alongside its opaque reference id.
    billing_provider: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)  # stripe|paddle
    provider_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    provider_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    current_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="subscription")


class UsageRecord(Base, UUIDPKMixin, TimestampMixin):
    """Monthly usage counters per user/feature, used for plan-limit enforcement."""
    __tablename__ = "usage_records"
    __table_args__ = (
        Index("ix_usage_user_feature_period", "user_id", "feature", "period"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    feature: Mapped[str] = mapped_column(String(64), nullable=False)  # resume_analysis|job_match|interview_session
    period: Mapped[date] = mapped_column(Date, nullable=False)  # first day of month
    count: Mapped[int] = mapped_column(default=0, nullable=False)


class Notification(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class AuditLog(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "audit_logs"

    actor_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    target_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    target_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
