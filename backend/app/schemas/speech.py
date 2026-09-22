from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class VoiceAnswerResponse(BaseModel):
    """Returned right after transcription. The audio itself was never
    stored — only these derived fields persist (section 15/16)."""
    answer_id: UUID
    transcript: str
    words_per_minute: Optional[float]
    filler_word_count: Optional[int]
    repeated_word_count: Optional[int]


class VisualMetricsIn(BaseModel):
    """Computed entirely client-side (MediaPipe, in the browser) and
    submitted as aggregate numbers only — never a frame or video clip
    (section 16/44). Observable-behavior language only."""
    face_visible_pct: float = Field(ge=0, le=100)
    eye_contact_pct: float = Field(ge=0, le=100)
    head_movement_score: float = Field(ge=0, le=100)
    hand_movement_score: Optional[float] = Field(default=None, ge=0, le=100)
    posture_notes: list[str] = Field(default_factory=list)


class VisualMetricsOut(VisualMetricsIn):
    model_config = {"from_attributes": True}
