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
    plan: {
        "resume_analysis": getattr(settings, f"{key}_RESUME_ANALYSES_MONTHLY"),
        "job_match": getattr(settings, f"{key}_JOB_MATCHES_MONTHLY"),
        "interview_session": getattr(settings, f"{key}_INTERVIEW_SESSIONS_MONTHLY"),
        "speech_practice": getattr(settings, f"{key}_SPEECH_PRACTICE_MONTHLY"),
        "resume_generation": getattr(settings, f"{key}_RESUME_GENERATIONS_MONTHLY"),
        "learning_plan": getattr(settings, f"{key}_LEARNING_PLANS_MONTHLY"),
    }
    for plan, key in (("free", "FREE"), ("premium", "PREMIUM"), ("pro", "PRO"))
}

# Per-session caps (see config). These are what actually bound cost: a
# monthly session limit alone doesn't, since one session could be endless.
SESSION_CAPS = {
    plan: {
        "max_questions": getattr(settings, f"{key}_MAX_QUESTIONS_PER_SESSION"),
        "max_evaluations": getattr(settings, f"{key}_MAX_EVALUATIONS_PER_SESSION"),
        "max_speech_attempts": getattr(settings, f"{key}_MAX_SPEECH_ATTEMPTS"),
    }
    for plan, key in (("free", "FREE"), ("premium", "PREMIUM"), ("pro", "PRO"))
}


SPEECH_TOPICS = {
    plan: getattr(settings, f"{key}_SPEECH_TOPICS")
    for plan, key in (("free", "FREE"), ("premium", "PREMIUM"), ("pro", "PRO"))
}


def speech_topic_limit(plan: str) -> int:
    return SPEECH_TOPICS.get(plan, SPEECH_TOPICS["free"])


def session_caps(plan: str) -> dict:
    return SESSION_CAPS.get(plan, SESSION_CAPS["free"])


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
