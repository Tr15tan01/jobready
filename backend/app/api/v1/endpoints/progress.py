from collections import Counter
from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.job import Job, JobMatch
from app.models.progress import CandidateProgress
from app.models.user import User
from app.schemas.progress import ProgressPointOut, ProgressSummaryOut
from app.services.auth.jwt import get_current_user

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
