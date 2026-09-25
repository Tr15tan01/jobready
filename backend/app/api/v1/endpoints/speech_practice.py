import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.speech_prompts import (
    PROMPT_BANK, SPEECH_PRACTICE_LABELS, SPEECH_PRACTICE_MODES, get_random_prompt,
)
from app.db.session import get_db
from app.models.interview import InterviewQuestion, InterviewSession
from app.models.user import User
from app.schemas.speech_practice import StartSpeechPracticeRequest, StartSpeechPracticeResponse
from app.services.auth.jwt import get_current_user
from app.services.usage import SPEECH_TOPICS, check_and_increment_usage, speech_topic_limit

router = APIRouter()


@router.get("/modes")
async def list_modes() -> list[dict]:
    """The 6 Speech Practice modes, with how many topics each plan unlocks."""
    return [
        {
            "value": m,
            "label": SPEECH_PRACTICE_LABELS[m],
            "topics": {plan: min(n, len(PROMPT_BANK[m])) for plan, n in SPEECH_TOPICS.items()},
        }
        for m in SPEECH_PRACTICE_MODES
    ]


async def _recent_prompts(db: AsyncSession, user: User, mode: str) -> list[str]:
    """The user's recent prompts for this mode, newest first, so a new
    session never repeats a topic until the plan's pool is used up."""
    return list((await db.execute(
        select(InterviewQuestion.prompt)
        .join(InterviewSession, InterviewSession.id == InterviewQuestion.session_id)
        .where(
            InterviewSession.user_id == user.id,
            InterviewSession.session_type == "speech_practice",
            InterviewSession.mode == mode,
        )
        .order_by(InterviewQuestion.created_at.desc())
        .limit(len(PROMPT_BANK[mode]))
    )).scalars().all())


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

    limit = speech_topic_limit(plan)
    recent = await _recent_prompts(db, user, payload.mode)
    prompt_text = get_random_prompt(payload.mode, limit=limit, recent=recent)

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
        plan=plan, topics_available=min(limit, len(PROMPT_BANK[payload.mode])),
        topics_total=len(PROMPT_BANK[payload.mode]),
    )


@router.post("/{session_id}/shuffle", response_model=StartSpeechPracticeResponse)
async def shuffle_topic(
    session_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StartSpeechPracticeResponse:
    """Swap the topic of a session that hasn't been answered yet. Free of
    charge: it's a lookup in the static bank, no AI call, and it doesn't
    count as a new session."""
    from app.api.v1.endpoints.interviews import _get_owned_session

    session = await _get_owned_session(db, user, session_id)
    if session.session_type != "speech_practice" or session.status != "in_progress":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This session can't change topic.")
    question = next(iter(sorted(session.questions, key=lambda q: q.order_index)), None)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    if question.answer is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You've already answered this topic. Finish, then start a new session for a fresh topic.",
        )

    plan = user.subscription.plan if user.subscription else "free"
    limit = speech_topic_limit(plan)
    recent = [question.prompt, *await _recent_prompts(db, user, session.mode)]
    question.prompt = get_random_prompt(session.mode, limit=limit, recent=recent)
    await db.commit()

    return StartSpeechPracticeResponse(
        session_id=session.id, question_id=question.id, mode=session.mode, prompt=question.prompt,
        plan=plan, topics_available=min(limit, len(PROMPT_BANK[session.mode])),
        topics_total=len(PROMPT_BANK[session.mode]),
    )
