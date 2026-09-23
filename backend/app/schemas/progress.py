from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

ItemType = Literal["practice", "reading", "mock_interview"]


class LearningPlanItemGen(BaseModel):
    day_number: int
    title: str
    description: Optional[str] = None
    item_type: ItemType = "practice"


class LearningPlanGeneration(BaseModel):
    """Contract the AI learning-plan operation must return."""
    items: list[LearningPlanItemGen] = Field(default_factory=list)


# ---- API request/response models -----------------------------------------

class ProgressPointOut(BaseModel):
    recorded_at: datetime
    overall_score: float
    technical_score: Optional[float]
    communication_score: Optional[float]
    structure_score: Optional[float]

    model_config = {"from_attributes": True}


class ProgressSummaryOut(BaseModel):
    """Feeds the dashboard readiness cards (section 8)."""
    resume_match_pct: Optional[float] = None
    interview_readiness_pct: Optional[float] = None
    communication_pct: Optional[float] = None
    technical_readiness_pct: Optional[float] = None
    recent_interview_score: Optional[float] = None
    weakest_areas: list[str] = Field(default_factory=list)
    recommended_next_action: Optional[str] = None
    history: list[ProgressPointOut] = Field(default_factory=list)


class GeneratePlanRequest(BaseModel):
    job_id: Optional[UUID] = None
    days: int = 7


class LearningItemOut(BaseModel):
    id: UUID
    day_number: int
    title: str
    description: Optional[str]
    item_type: str
    is_complete: bool

    model_config = {"from_attributes": True}


class LearningPlanOut(BaseModel):
    id: UUID
    title: str
    is_active: bool
    items: list[LearningItemOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ItemUpdateRequest(BaseModel):
    """All fields optional so the same endpoint handles ticking an item
    off and editing its text."""
    is_complete: Optional[bool] = None
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
