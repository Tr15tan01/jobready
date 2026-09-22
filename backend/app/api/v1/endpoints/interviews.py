import uuid
from statistics import mean
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.rate_limit import ai_rate_limit, limiter
from app.db.session import get_db
from app.models.interview import (
    AnswerEvaluation, InterviewAnswer, InterviewQuestion, InterviewSession, SpeechMetrics, VisualMetrics,
)
from app.models.job import Job
from app.models.progress import CandidateProgress
from app.models.resume import Resume
from app.models.user import User
from app.schemas.interview import (
    CompleteSessionResponse,
    EvaluateAnswerRequest,
    EvaluationOut,
    InterviewSessionCreate,
    InterviewSessionOut,
    QuestionOut,
    SubmitAnswerRequest,
)
from app.schemas.speech import VisualMetricsIn, VisualMetricsOut, VoiceAnswerResponse
from app.services.ai.base import get_ai_service
from app.services.auth.jwt import get_current_user
from app.services.speech.base import get_speech_provider
from app.services.speech.metrics import compute_speech_metrics
from app.services.usage import check_and_increment_usage

MAX_AUDIO_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_AUDIO_TYPES = {"audio/webm", "audio/wav", "audio/mpeg", "audio/mp4", "audio/ogg"}

router = APIRouter()


async def _get_owned_session(db: AsyncSession, user: User, session_id: uuid.UUID) -> InterviewSession:
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session_id, InterviewSession.user_id == user.id)
        .options(
            selectinload(InterviewSession.questions).selectinload(InterviewQuestion.answer)
            .selectinload(InterviewAnswer.evaluation)
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")
    return session


async def _job_context(db: AsyncSession, user: User, job_id: Optional[uuid.UUID]) -> tuple[Optional[str], Optional[dict]]:
    if not job_id:
        return None, None
    job = (await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == user.id).options(selectinload(Job.requirements))
    )).scalar_one_or_none()
    if not job:
        return None, None
    req = job.requirements
    requirements = {
        "required_skills": req.required_skills, "responsibilities": req.responsibilities,
        "technologies": req.technologies,
    } if req else None
    return job.title, requirements


async def _candidate_summary(db: AsyncSession, user: User) -> Optional[str]:
    resume = (await db.execute(
        select(Resume).where(Resume.user_id == user.id, Resume.is_primary.is_(True))
        .options(selectinload(Resume.versions))
    )).scalar_one_or_none()
    if not resume or not resume.versions:
        return None
    return (resume.versions[0].content or {}).get("summary")


@router.post("", response_model=InterviewSessionOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(ai_rate_limit)
async def create_session(
    request: Request,
    payload: InterviewSessionCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InterviewSession:
    plan = user.subscription.plan if user.subscription else "free"
    await check_and_increment_usage(db, user.id, plan, "interview_session")

    job_title, job_requirements = await _job_context(db, user, payload.job_id)
    candidate_summary = await _candidate_summary(db, user)

    session = InterviewSession(
        user_id=user.id, job_id=payload.job_id, mode=payload.mode, difficulty=payload.difficulty,
        input_mode=payload.input_mode, camera_enabled=payload.camera_enabled, status="in_progress",
    )
    db.add(session)
    await db.flush()

    ai = get_ai_service()
    question = await ai.generate_question(
        db, user.id, mode=payload.mode, difficulty=payload.difficulty, job_title=job_title,
        job_requirements=job_requirements, candidate_summary=candidate_summary,
        previous_qa=[], custom_topic=payload.custom_topic, locale=user.locale,
    )
    db.add(InterviewQuestion(
        session_id=session.id, order_index=0, category=question.category,
        prompt=question.prompt or "Tell me about yourself and why you're interested in this role.",
    ))
    await db.commit()
    await db.refresh(session, attribute_names=["questions"])
    return session


@router.get("/{session_id}", response_model=InterviewSessionOut)
async def get_session(
    session_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InterviewSession:
    return await _get_owned_session(db, user, session_id)


@router.post("/{session_id}/answers", status_code=status.HTTP_201_CREATED)
async def submit_answer(
    session_id: uuid.UUID,
    payload: SubmitAnswerRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    session = await _get_owned_session(db, user, session_id)
    question = next((q for q in session.questions if q.id == payload.question_id), None)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    answer = InterviewAnswer(
        question_id=question.id, transcript=payload.transcript, input_mode=payload.input_mode,
        duration_seconds=payload.duration_seconds, retry_of_answer_id=payload.retry_of_answer_id,
    )
    db.add(answer)
    await db.commit()
    await db.refresh(answer)
    return {"id": str(answer.id)}


@router.post("/{session_id}/evaluate", response_model=EvaluationOut)
async def evaluate_answer(
    session_id: uuid.UUID,
    payload: EvaluateAnswerRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AnswerEvaluation:
    session = await _get_owned_session(db, user, session_id)
    answer = None
    question_prompt = None
    for q in session.questions:
        if q.answer and q.answer.id == payload.answer_id:
            answer = q.answer
            question_prompt = q.prompt
            break
    if answer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Answer not found")

    ai = get_ai_service()
    result = await ai.evaluate_answer(
        db, user.id, mode=session.mode, question=question_prompt, answer=answer.transcript, locale=user.locale,
    )

    evaluation = AnswerEvaluation(
        answer_id=answer.id, score=result.score, strengths=result.strengths,
        improvements=result.improvements, missing_points=result.missing_points,
        suggested_answer=result.suggested_answer, practice_focus=result.practice_focus,
        criteria_breakdown=result.criteria_breakdown,
    )
    db.add(evaluation)
    await db.commit()
    await db.refresh(evaluation)
    return evaluation


@router.post("/{session_id}/next-question", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
async def next_question(
    session_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InterviewQuestion:
    """Generates the next question based on prior answers — never all
    questions up front (section 14), keeping AI cost proportional to
    actual usage."""
    session = await _get_owned_session(db, user, session_id)

    previous_qa = [
        {"question": q.prompt, "answer": q.answer.transcript}
        for q in sorted(session.questions, key=lambda x: x.order_index)
        if q.answer
    ]
    last_answered = next(
        (q.answer for q in reversed(session.questions) if q.answer), None
    )

    job_title, job_requirements = await _job_context(db, user, session.job_id)
    candidate_summary = await _candidate_summary(db, user)

    ai = get_ai_service()
    generated = await ai.generate_question(
        db, user.id, mode=session.mode, difficulty=session.difficulty, job_title=job_title,
        job_requirements=job_requirements, candidate_summary=candidate_summary,
        previous_qa=previous_qa, custom_topic=None, locale=user.locale,
    )

    question = InterviewQuestion(
        session_id=session.id,
        order_index=max((q.order_index for q in session.questions), default=-1) + 1,
        category=generated.category,
        prompt=generated.prompt or "What would you do differently next time?",
        generated_from_answer_id=last_answered.id if last_answered else None,
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.post("/{session_id}/complete", response_model=CompleteSessionResponse)
async def complete_session(
    session_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InterviewSession:
    session = await _get_owned_session(db, user, session_id)

    scores = [q.answer.evaluation.score for q in session.questions if q.answer and q.answer.evaluation]
    if scores:
        session.overall_score = round(mean(scores), 1)
        # Communication/structure are approximated from criteria_breakdown
        # keys when the model supplied them; this is a simple aggregate,
        # refined further in Phase 6 (progress analytics).
        comm_scores, struct_scores, tech_scores = [], [], []
        for q in session.questions:
            if q.answer and q.answer.evaluation and q.answer.evaluation.criteria_breakdown:
                cb = q.answer.evaluation.criteria_breakdown
                if "clarity" in cb:
                    comm_scores.append(cb["clarity"])
                if "structure" in cb:
                    struct_scores.append(cb["structure"])
                for key in ("correctness", "depth", "reasoning"):
                    if key in cb:
                        tech_scores.append(cb[key])
        session.communication_score = round(mean(comm_scores), 1) if comm_scores else None
        session.structure_score = round(mean(struct_scores), 1) if struct_scores else None
        session.technical_score = round(mean(tech_scores), 1) if tech_scores else None

    session.status = "completed"

    # Collect the weakness data BEFORE committing. db.refresh() below
    # expires this instance's loaded relationships, so touching
    # session.questions afterwards would trigger a lazy load and raise
    # MissingGreenlet under the async engine.
    weaknesses: list[str] = []
    if scores:
        for q in session.questions:
            if q.answer and q.answer.evaluation:
                weaknesses.extend(q.answer.evaluation.improvements or [])
                weaknesses.extend(q.answer.evaluation.missing_points or [])

    await db.commit()
    # Refresh only the scalar columns we just wrote — passing
    # attribute_names keeps the eagerly-loaded relationships intact.
    await db.refresh(
        session,
        attribute_names=["status", "overall_score", "communication_score",
                         "structure_score", "technical_score", "duration_seconds"],
    )

    # Feed Progress tracking (section 21) — one snapshot per completed
    # session, with recurring weaknesses drawn straight from the AI's own
    # per-answer "improvements"/"missing_points", not re-derived.
    if scores:
        from datetime import datetime, timezone

        db.add(CandidateProgress(
            user_id=user.id,
            recorded_at=datetime.now(timezone.utc),
            interview_session_id=session.id,
            overall_score=session.overall_score,
            technical_score=session.technical_score,
            communication_score=session.communication_score,
            structure_score=session.structure_score,
            recurring_weaknesses=weaknesses[:10],
        ))
        await db.commit()

    return session


@router.post(
    "/{session_id}/answers/voice",
    response_model=VoiceAnswerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_voice_answer(
    session_id: uuid.UUID,
    question_id: uuid.UUID,
    audio: UploadFile,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    duration_seconds: Optional[int] = None,
) -> dict:
    """Accepts a voice answer. The audio is transcribed in memory and
    IMMEDIATELY discarded — only the transcript and derived speech
    metrics are ever persisted (section 15/16). No file is written to
    disk or object storage at any point in this request."""
    session = await _get_owned_session(db, user, session_id)
    question = next((q for q in session.questions if q.id == question_id), None)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    if audio.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported audio format."
        )
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Audio exceeds 15MB limit.")
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio.")

    provider = get_speech_provider()
    transcript = await provider.transcribe(audio_bytes, audio.content_type, user.locale)
    del audio_bytes  # explicit: nothing beyond this line ever touches raw audio again

    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not transcribe audio — please try again or switch to text.",
        )

    metrics = compute_speech_metrics(transcript, duration_seconds, user.locale)

    answer = InterviewAnswer(
        question_id=question.id, transcript=transcript, input_mode="voice",
        duration_seconds=duration_seconds,
    )
    db.add(answer)
    await db.flush()

    db.add(SpeechMetrics(
        answer_id=answer.id,
        words_per_minute=metrics["words_per_minute"],
        filler_word_count=metrics["filler_word_count"],
        language=metrics["language"],
    ))
    await db.commit()
    await db.refresh(answer)

    return VoiceAnswerResponse(
        answer_id=answer.id, transcript=transcript,
        words_per_minute=metrics["words_per_minute"],
        filler_word_count=metrics["filler_word_count"],
        repeated_word_count=metrics["repeated_word_count"],
    )


@router.post("/{session_id}/answers/{answer_id}/visual-metrics", response_model=VisualMetricsOut)
async def submit_visual_metrics(
    session_id: uuid.UUID,
    answer_id: uuid.UUID,
    payload: VisualMetricsIn,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VisualMetrics:
    """Stores ONLY the aggregate numbers computed client-side by
    MediaPipe. No frame, image, or video ever reaches this endpoint or
    this server (section 16/44) — camera_enabled on the session is the
    only trace that video coaching was used."""
    session = await _get_owned_session(db, user, session_id)
    answer = next(
        (q.answer for q in session.questions if q.answer and q.answer.id == answer_id), None
    )
    if answer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Answer not found")

    existing = (await db.execute(
        select(VisualMetrics).where(VisualMetrics.answer_id == answer_id)
    )).scalar_one_or_none()

    if existing:
        existing.face_visible_pct = payload.face_visible_pct
        existing.eye_contact_pct = payload.eye_contact_pct
        existing.head_movement_score = payload.head_movement_score
        existing.hand_movement_score = payload.hand_movement_score
        existing.posture_notes = payload.posture_notes
        metrics = existing
    else:
        metrics = VisualMetrics(
            answer_id=answer_id, face_visible_pct=payload.face_visible_pct,
            eye_contact_pct=payload.eye_contact_pct, head_movement_score=payload.head_movement_score,
            hand_movement_score=payload.hand_movement_score, posture_notes=payload.posture_notes,
        )
        db.add(metrics)

    if not session.camera_enabled:
        session.camera_enabled = True

    await db.commit()
    await db.refresh(metrics)
    return metrics
