from typing import Literal
from uuid import UUID

from pydantic import BaseModel

SpeechPracticeMode = Literal["persuasive", "impromptu", "storytelling", "presentation", "debate", "pitch"]


class StartSpeechPracticeRequest(BaseModel):
    mode: SpeechPracticeMode
    input_mode: Literal["text", "voice"] = "voice"
    camera_enabled: bool = False


class StartSpeechPracticeResponse(BaseModel):
    session_id: UUID
    question_id: UUID
    mode: SpeechPracticeMode
    prompt: str
    plan: str = "free"
    topics_available: int = 0
    topics_total: int = 0
