from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.speech_prompts import SPEECH_PRACTICE_LABELS, SPEECH_PRACTICE_MODES, get_random_prompt
from app.db.session import get_db
from app.models.interview import InterviewQuestion, InterviewSession
from app.models.user import User
from app.schemas.speech_practice import StartSpeechPracticeRequest, StartSpeechPracticeResponse
from app.services.auth.jwt import get_current_user
from app.services.usage import check_and_increment_usage

router = APIRouter()


@router.get("/modes")
async def list_modes() -> list[dict]:
    """The 6 available Speech Practice modes — capped by design."""
    return [{"value": m, "label": SPEECH_PRACTICE_LABELS[m]} for m in SPEECH_PRACTICE_MODES]


@router.post("/start", response_model=StartSpeechPracticeResponse, status_code=201)
async def start_speech_practice(
    payload: StartSpeechPracticeRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StartSpeechPracticeResponse:
    """Picks a random prompt from the static bank (no AI call needed to
    choose a topic - section 25) and creates a single-question session.
    Everything after this point (submit answer, evaluate, visual
    metrics, complete) reuses the existing /interviews endpoints
    unchanged, since the flow - prompt, speak, transcript + metrics,
    evaluation, score, retry or finish - is identical."""
    plan = user.subscription.plan if user.subscription else "free"
    await check_and_increment_usage(db, user.id, plan, "speech_practice")

    prompt_text = get_random_prompt(payload.mode)

    session = InterviewSession(
        user_id=user.id, mode=payload.mode, session_type="speech_practice",
        difficulty="medium", input_mode=payload.input_mode, camera_enabled=payload.camera_enabled,
        status="in_progress",
    )
    db.add(session)
    await db.flush()

    question = InterviewQuestion(
        session_id=session.id, order_index=0, category=payload.mode, prompt=prompt_text,
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)

    return StartSpeechPracticeResponse(
        session_id=session.id, question_id=question.id, mode=payload.mode, prompt=prompt_text,
    )
