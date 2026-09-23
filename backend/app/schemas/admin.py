from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class AdminUserOut(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    plan: str
    is_active: bool
    is_admin: bool
    email_verified: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserList(BaseModel):
    total: int
    users: list[AdminUserOut]


class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    plan: Optional[Literal["free", "premium", "pro"]] = None


class RecentSession(BaseModel):
    """Session metadata only — never the transcript."""
    id: UUID
    session_type: str
    mode: str
    status: str
    overall_score: Optional[float]
    created_at: datetime


class AdminUserDetail(BaseModel):
    """Behaviour and aggregates. Deliberately excludes resume contents,
    job descriptions and interview transcripts (spec section 28)."""
    user: AdminUserOut
    headline: Optional[str]
    resumes: int
    jobs: int
    interview_sessions: int
    speech_sessions: int
    completed_sessions: int
    average_score: Optional[float]
    ai_requests: int
    ai_cost_usd: float
    last_active: Optional[datetime]
    usage_this_month: dict[str, int]
    recent_sessions: list[RecentSession]


class AdminStatsOut(BaseModel):
    total_users: int
    active_users: int
    disabled_users: int
    new_users_7d: int
    active_users_7d: int
    users_by_plan: dict[str, int]
    total_ai_requests: int
    estimated_ai_spend_usd: float
    cost_per_user_usd: float
    cost_by_feature: dict[str, float]
    requests_by_model: dict[str, int]
    total_interview_sessions: int
    total_speech_sessions: int
    completed_sessions: int
    average_score: Optional[float]
    total_resumes: int
    total_jobs: int


class DailyPoint(BaseModel):
    day: str
    signups: int
    sessions: int
    ai_cost_usd: float
