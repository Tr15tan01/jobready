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
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    plan: Optional[Literal["free", "premium", "pro"]] = None


class AdminStatsOut(BaseModel):
    total_users: int
    active_users: int
    total_ai_requests: int
    estimated_ai_spend_usd: float
    cost_by_feature: dict[str, float]
    requests_by_model: dict[str, int]
    total_interview_sessions: int
    total_resumes: int
    total_jobs: int
