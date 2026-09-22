from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

# "domain" replaces the previously separate "technical"/"system_design"
# modes — depth questions now adapt to whatever field the job is in,
# rather than assuming software engineering (see prompts/interview_question.py).
#
# The six values after "custom" are Speech Practice modes (general
# communication coaching, not tied to a job) — deliberately capped at six
# so the mode picker stays simple rather than sprawling.
InterviewMode = Literal[
    "behavioral", "domain", "hr", "general", "custom",
    "persuasive", "impromptu", "storytelling", "presentation", "debate", "pitch",
]
SessionType = Literal["interview", "speech_practice"]
Difficulty = Literal["easy", "medium", "hard"]
InputMode = Literal["text", "voice", "video"]


class GeneratedQuestion(BaseModel):
    prompt: str = ""
    category: str = "general"


class AnswerEvaluationResult(BaseModel):
    score: float = 0.0
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    missing_points: list[str] = Field(default_factory=list)
    suggested_answer: Optional[str] = None
    practice_focus: Optional[str] = None
    criteria_breakdown: dict[str, float] = Field(default_factory=dict)


# ---- API request/response models -----------------------------------------

class InterviewSessionCreate(BaseModel):
    job_id: Optional[UUID] = None
    mode: InterviewMode = "general"
    difficulty: Difficulty = "medium"
    input_mode: InputMode = "text"
    camera_enabled: bool = False
    custom_topic: Optional[str] = None


class QuestionOut(BaseModel):
    id: UUID
    order_index: int
    category: Optional[str]
    prompt: str

    model_config = {"from_attributes": True}


class EvaluationOut(BaseModel):
    score: float
    strengths: list[str]
    improvements: list[str]
    missing_points: list[str]
    suggested_answer: Optional[str]
    practice_focus: Optional[str]
    criteria_breakdown: Optional[dict]

    model_config = {"from_attributes": True}


class AnswerOut(BaseModel):
    id: UUID
    transcript: str
    input_mode: str
    evaluation: Optional[EvaluationOut] = None

    model_config = {"from_attributes": True}


class InterviewSessionOut(BaseModel):
    id: UUID
    mode: str
    session_type: SessionType = "interview"
    difficulty: str
    input_mode: str
    status: str
    overall_score: Optional[float]
    communication_score: Optional[float]
    technical_score: Optional[float]
    structure_score: Optional[float]
    questions: list[QuestionOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class SubmitAnswerRequest(BaseModel):
    question_id: UUID
    transcript: str
    input_mode: InputMode = "text"
    duration_seconds: Optional[int] = None
    retry_of_answer_id: Optional[UUID] = None


class EvaluateAnswerRequest(BaseModel):
    answer_id: UUID


class CompleteSessionResponse(BaseModel):
    id: UUID
    status: str
    overall_score: Optional[float]
    communication_score: Optional[float]
    technical_score: Optional[float]
    structure_score: Optional[float]
    duration_seconds: Optional[int]
