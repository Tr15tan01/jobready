"""
Usage and plan endpoints — powers the "what am I allowed, what have I
used" view in Settings. Limits come from the central config
(services/usage.py), never hard-coded in the frontend.
"""
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import UsageRecord, User
from app.services.auth.jwt import get_current_user
from app.core.config import settings
from app.services.usage import _LIMITS, session_caps, speech_topic_limit

router = APIRouter()

FEATURE_LABELS = {
    "resume_analysis": "Resume analyses",
    "job_match": "Job matches",
    "interview_session": "Interview sessions",
    "speech_practice": "Speech practice sessions",
    "resume_generation": "AI resume generations",
    "learning_plan": "Learning plans",
}

def _plan_descriptions() -> dict:
    """Built from the live config so the listed numbers can never drift
    from what's enforced. Lists only differences that actually exist in
    code — e.g. video answers work on every plan, so video isn't sold as
    a paid-only feature."""
    def caps(plan):
        return session_caps(plan)

    def L(plan):
        return _LIMITS[plan]

    shared = [
        "Text, voice and video answers",
        "Score and written feedback on every answer",
        "Transparent job-match scoring",
        "Video analysed on your device — never uploaded",
    ]
    return {
        "free": {
            "name": "Free", "price": "$0", "tagline": "Everything you need to start practising.",
            "features": [
                f"{L('free')['interview_session']} interviews a month, up to {caps('free')['max_questions']} questions each",
                f"{L('free')['speech_practice']} speech sessions a month, {caps('free')['max_speech_attempts']} attempts each",
                f"{speech_topic_limit('free')} topics per speech type",
                f"{L('free')['job_match']} job matches · {L('free')['resume_analysis']} resume analyses · {L('free')['resume_generation']} AI-built resumes",
                *shared,
                "Delivery summary: face in frame and speaking pace",
            ],
        },
        "premium": {
            "name": "Premium", "price": f"${settings.PREMIUM_PRICE_USD:g}/mo", "tagline": "For an active job search.",
            "features": [
                f"{L('premium')['interview_session']} interviews a month, up to {caps('premium')['max_questions']} questions each",
                f"{L('premium')['speech_practice']} speech sessions a month, {caps('premium')['max_speech_attempts']} attempts each",
                f"{speech_topic_limit('premium')} topics per speech type",
                f"{L('premium')['job_match']} job matches · {L('premium')['resume_analysis']} resume analyses · {L('premium')['resume_generation']} AI-built resumes",
                f"{L('premium')['learning_plan']} personalised learning plans a month",
                "Full delivery analysis: eye contact, head movement, filler words and observations",
                "Longer sessions with more retries per question",
            ],
        },
        "pro": {
            "name": "Pro", "price": f"${settings.PRO_PRICE_USD:g}/mo", "tagline": "For intensive preparation.",
            "features": [
                f"{L('pro')['interview_session']} interviews a month, up to {caps('pro')['max_questions']} questions each",
                f"{L('pro')['speech_practice']} speech sessions a month, {caps('pro')['max_speech_attempts']} attempts each",
                f"All {speech_topic_limit('pro')} topics per speech type",
                f"{L('pro')['job_match']} job matches · {L('pro')['resume_analysis']} resume analyses · {L('pro')['resume_generation']} AI-built resumes",
                f"{L('pro')['learning_plan']} personalised learning plans a month",
                "Full delivery analysis: eye contact, head movement, filler words and observations",
                "Our longest sessions and most retries per question",
            ],
        },
    }


def _current_period() -> date:
    return date.today().replace(day=1)


@router.get("")
async def get_usage(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Current plan, its limits, and how much of each the user has spent
    this calendar month."""
    plan = user.subscription.plan if user.subscription else "free"
    limits = _LIMITS.get(plan, _LIMITS["free"])
    period = _current_period()

    rows = (await db.execute(
        select(UsageRecord).where(
            UsageRecord.user_id == user.id, UsageRecord.period == period,
        )
    )).scalars().all()
    used = {r.feature: r.count for r in rows}

    return {
        "plan": plan,
        "period": period.isoformat(),
        "features": [
            {
                "key": feature,
                "label": FEATURE_LABELS.get(feature, feature),
                "used": used.get(feature, 0),
                "limit": limit,
                "remaining": max(0, limit - used.get(feature, 0)),
            }
            for feature, limit in limits.items()
        ],
    }


@router.get("/plans")
async def get_plans() -> dict:
    """Plan comparison, including each plan's monthly limits. Public so
    the pricing view can render without a session."""
    return {
        "plans": [
            {
                **_plan_descriptions()[plan_key],
                "key": plan_key,
                "session_caps": session_caps(plan_key),
                "speech_topics": speech_topic_limit(plan_key),
                "limits": [
                    {"key": f, "label": FEATURE_LABELS.get(f, f), "limit": lim}
                    for f, lim in _LIMITS[plan_key].items()
                ],
            }
            for plan_key in ("free", "premium", "pro")
        ]
    }
