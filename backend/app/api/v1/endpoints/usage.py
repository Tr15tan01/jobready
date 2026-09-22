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
from app.services.usage import _LIMITS

router = APIRouter()

FEATURE_LABELS = {
    "resume_analysis": "Resume analyses",
    "job_match": "Job matches",
    "interview_session": "Interview sessions",
    "speech_practice": "Speech practice sessions",
    "resume_generation": "AI resume generations",
}

PLAN_DESCRIPTIONS = {
    "free": {
        "name": "Free",
        "price": "$0",
        "tagline": "Get a feel for how JobReady works.",
        "features": [
            "Resume parsing and structured extraction",
            "Transparent job match scoring",
            "Text and voice interview practice",
            "Speech metrics (pace, filler words)",
            "Basic answer feedback",
        ],
    },
    "premium": {
        "name": "Premium",
        "price": "$19/mo",
        "tagline": "For an active job search.",
        "features": [
            "Everything in Free, with 10x the monthly usage",
            "Resume tailoring against a specific job",
            "Advanced answer evaluation",
            "Personalised learning plans",
            "Progress tracking across sessions",
        ],
    },
    "pro": {
        "name": "Pro",
        "price": "$49/mo",
        "tagline": "For intensive preparation and coaching.",
        "features": [
            "Everything in Premium, with very high limits",
            "Video coaching with on-device analysis",
            "Detailed analytics and weakness tracking",
            "Priority access to new coaching features",
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
                **PLAN_DESCRIPTIONS[plan_key],
                "key": plan_key,
                "limits": [
                    {"key": f, "label": FEATURE_LABELS.get(f, f), "limit": lim}
                    for f, lim in _LIMITS[plan_key].items()
                ],
            }
            for plan_key in ("free", "premium", "pro")
        ]
    }
