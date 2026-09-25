from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.interview import (
    AnswerEvaluation, InterviewAnswer, InterviewQuestion, InterviewSession, SpeechMetrics, VisualMetrics,
)
from app.models.job import Job, JobMatch
from app.models.progress import CandidateProgress
from app.models.user import User
from app.schemas.progress import ProgressPointOut, ProgressSummaryOut
from app.services.auth.jwt import get_current_user
from app.services.progress_analytics import AnswerRecord, SessionRecord, build_activity

router = APIRouter()


@router.get("", response_model=ProgressSummaryOut)
async def get_progress(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProgressSummaryOut:
    # Most recent job match across all the candidate's jobs — stands in
    # for "Resume Match" on the dashboard (section 8).
    latest_match = (await db.execute(
        select(JobMatch).join(Job, JobMatch.job_id == Job.id).where(Job.user_id == user.id)
        .order_by(JobMatch.created_at.desc()).limit(1)
    )).scalar_one_or_none()

    history_rows = (await db.execute(
        select(CandidateProgress).where(CandidateProgress.user_id == user.id)
        .order_by(CandidateProgress.recorded_at.asc())
    )).scalars().all()

    latest_progress = history_rows[-1] if history_rows else None

    weakness_counter: Counter[str] = Counter()
    for row in history_rows[-5:]:  # recency-weighted: last 5 sessions
        weakness_counter.update(row.recurring_weaknesses or [])
    weakest_areas = [w for w, _ in weakness_counter.most_common(5)]

    recommended_action = _recommend_next_action(latest_match, latest_progress, weakest_areas)

    return ProgressSummaryOut(
        resume_match_pct=latest_match.overall_score if latest_match else None,
        interview_readiness_pct=(latest_progress.overall_score * 10) if latest_progress else None,
        communication_pct=(latest_progress.communication_score * 10) if latest_progress and latest_progress.communication_score else None,
        technical_readiness_pct=(latest_progress.technical_score * 10) if latest_progress and latest_progress.technical_score else None,
        recent_interview_score=latest_progress.overall_score if latest_progress else None,
        weakest_areas=weakest_areas,
        recommended_next_action=recommended_action,
        history=[ProgressPointOut.model_validate(r) for r in history_rows],
    )


def _recommend_next_action(
    latest_match: Optional[JobMatch], latest_progress: Optional[CandidateProgress], weakest_areas: list[str],
) -> str:
    if latest_match is None:
        return "Paste a job description to see how your resume matches."
    if latest_progress is None:
        return "Run a practice interview to establish your readiness baseline."
    if weakest_areas:
        return f"Practice on: {weakest_areas[0]}."
    if latest_match.gaps:
        return f"Address this gap in your resume or plan: {latest_match.gaps[0]}."
    return "Keep practicing to build consistency across sessions."


# Streaks and totals look back this far; the chart window is `days`.
HISTORY_DAYS = 365


@router.get("/activity")
async def get_activity(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(30, ge=7, le=90),
    tz_offset_minutes: int = Query(0, ge=-840, le=840, description="Browser's Date.getTimezoneOffset()"),
) -> dict:
    """Daily activity, streaks, breakdown by type, score distribution,
    delivery trends and insights. Days are counted in the user's local
    time (the browser sends its UTC offset) so a late-evening session
    lands on the right day. Aggregates only — no transcripts."""
    # getTimezoneOffset() is minutes *behind* UTC (e.g. -240 for UTC+4).
    shift = timedelta(minutes=-tz_offset_minutes)
    now_local = datetime.now(timezone.utc) + shift
    since = datetime.now(timezone.utc) - timedelta(days=HISTORY_DAYS)

    answer_rows = (await db.execute(
        select(
            InterviewAnswer.created_at, InterviewAnswer.duration_seconds,
            InterviewSession.id, InterviewSession.session_type, InterviewSession.mode,
            AnswerEvaluation.score, SpeechMetrics.words_per_minute, SpeechMetrics.filler_word_count,
            VisualMetrics.eye_contact_pct,
        )
        .join(InterviewQuestion, InterviewAnswer.question_id == InterviewQuestion.id)
        .join(InterviewSession, InterviewQuestion.session_id == InterviewSession.id)
        .outerjoin(AnswerEvaluation, AnswerEvaluation.answer_id == InterviewAnswer.id)
        .outerjoin(SpeechMetrics, SpeechMetrics.answer_id == InterviewAnswer.id)
        .outerjoin(VisualMetrics, VisualMetrics.answer_id == InterviewAnswer.id)
        .where(InterviewSession.user_id == user.id, InterviewAnswer.created_at >= since)
        .order_by(InterviewAnswer.created_at.asc())
    )).all()

    session_rows = (await db.execute(
        select(InterviewSession.created_at, InterviewSession.session_type, InterviewSession.mode, InterviewSession.status)
        .where(InterviewSession.user_id == user.id, InterviewSession.created_at >= since)
    )).all()

    answers = [
        AnswerRecord(
            at=(r[0] + shift), session_id=str(r[2]), session_type=r[3], mode=r[4], duration_seconds=r[1],
            score=r[5], wpm=r[6], fillers=r[7], eye_contact=r[8],
        )
        for r in answer_rows
    ]
    sessions = [
        SessionRecord(at=(r[0] + shift), session_type=r[1], mode=r[2], completed=r[3] == "completed")
        for r in session_rows
    ]
    return build_activity(answers, sessions, today=now_local.date(), days=days)
