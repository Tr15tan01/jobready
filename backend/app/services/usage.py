"""
Central plan-limit enforcement. Limits are read from `settings` (env-driven,
section 24) — never hard-coded in a route or component. Swap this to read
from a `plan_limits` DB table later without touching call sites.
"""
from datetime import date
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.progress import AIRequest  # noqa: F401  (kept for future cost-aware limiting)
from app.models.user import UsageRecord

_LIMITS = {
    "free": {
        "resume_analysis": settings.FREE_RESUME_ANALYSES_MONTHLY,
        "job_match": settings.FREE_JOB_MATCHES_MONTHLY,
        "interview_session": settings.FREE_INTERVIEW_SESSIONS_MONTHLY,
        "speech_practice": settings.FREE_SPEECH_PRACTICE_MONTHLY,
        "resume_generation": settings.FREE_RESUME_GENERATIONS_MONTHLY,
    },
    "premium": {
        "resume_analysis": settings.PREMIUM_RESUME_ANALYSES_MONTHLY,
        "job_match": settings.PREMIUM_JOB_MATCHES_MONTHLY,
        "interview_session": settings.PREMIUM_INTERVIEW_SESSIONS_MONTHLY,
        "speech_practice": settings.PREMIUM_SPEECH_PRACTICE_MONTHLY,
        "resume_generation": settings.PREMIUM_RESUME_GENERATIONS_MONTHLY,
    },
    "pro": {
        "resume_analysis": settings.PRO_RESUME_ANALYSES_MONTHLY,
        "job_match": settings.PRO_JOB_MATCHES_MONTHLY,
        "interview_session": settings.PRO_INTERVIEW_SESSIONS_MONTHLY,
        "speech_practice": settings.PRO_SPEECH_PRACTICE_MONTHLY,
        "resume_generation": settings.PRO_RESUME_GENERATIONS_MONTHLY,
    },
}


def _current_period() -> date:
    today = date.today()
    return today.replace(day=1)


async def check_and_increment_usage(db: AsyncSession, user_id: UUID, plan: str, feature: str) -> None:
    limit = _LIMITS.get(plan, _LIMITS["free"]).get(feature)
    if limit is None:
        return  # feature not limited

    period = _current_period()
    result = await db.execute(
        select(UsageRecord).where(
            UsageRecord.user_id == user_id,
            UsageRecord.feature == feature,
            UsageRecord.period == period,
        )
    )
    record = result.scalar_one_or_none()
    current = record.count if record else 0

    if current >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Monthly limit reached for {feature} on the {plan} plan ({limit}/mo). Upgrade to continue.",
        )

    if record:
        record.count += 1
    else:
        db.add(UsageRecord(user_id=user_id, feature=feature, period=period, count=1))
    await db.commit()
