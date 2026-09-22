import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.job import Job, JobMatch
from app.models.progress import CandidateProgress, LearningItem, LearningPlan
from app.models.user import User
from app.schemas.progress import GeneratePlanRequest, ItemUpdateRequest, LearningItemOut, LearningPlanOut
from app.services.ai.base import get_ai_service
from app.services.auth.jwt import get_current_user

router = APIRouter()


@router.post("/generate", response_model=LearningPlanOut, status_code=status.HTTP_201_CREATED)
async def generate_plan(
    payload: GeneratePlanRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LearningPlan:
    job_title = None
    skill_gaps: list[str] = []
    if payload.job_id:
        job = (await db.execute(select(Job).where(Job.id == payload.job_id, Job.user_id == user.id))).scalar_one_or_none()
        if job is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        job_title = job.title
        latest_match = (await db.execute(
            select(JobMatch).where(JobMatch.job_id == job.id).order_by(JobMatch.created_at.desc()).limit(1)
        )).scalar_one_or_none()
        if latest_match:
            skill_gaps = latest_match.gaps or []

    recurring_weaknesses: list[str] = []
    latest_progress = (await db.execute(
        select(CandidateProgress).where(CandidateProgress.user_id == user.id)
        .order_by(CandidateProgress.recorded_at.desc()).limit(1)
    )).scalar_one_or_none()
    if latest_progress:
        recurring_weaknesses = latest_progress.recurring_weaknesses or []

    ai = get_ai_service()
    generated = await ai.generate_learning_plan(
        db, user.id, days=payload.days, job_title=job_title,
        skill_gaps=skill_gaps, recurring_weaknesses=recurring_weaknesses, locale=user.locale,
    )

    # Only one active plan at a time.
    existing_active = (await db.execute(
        select(LearningPlan).where(LearningPlan.user_id == user.id, LearningPlan.is_active.is_(True))
    )).scalars().all()
    for p in existing_active:
        p.is_active = False

    plan = LearningPlan(
        user_id=user.id, job_id=payload.job_id,
        title=f"{payload.days}-day prep plan" + (f" for {job_title}" if job_title else ""),
        is_active=True,
    )
    db.add(plan)
    await db.flush()

    if not generated.items:
        # Graceful fallback (section 42) — a plan with zero AI items is
        # still a usable, if generic, starting point rather than an error.
        db.add(LearningItem(
            plan_id=plan.id, day_number=1, title="Practice a mock interview",
            description="Run a general practice session to establish a baseline.",
            item_type="mock_interview",
        ))
    else:
        for item in generated.items:
            db.add(LearningItem(
                plan_id=plan.id, day_number=item.day_number, title=item.title,
                description=item.description, item_type=item.item_type,
            ))

    await db.commit()
    await db.refresh(plan, attribute_names=["items"])
    return plan


@router.get("", response_model=LearningPlanOut | None)
async def get_active_plan(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    plan = (await db.execute(
        select(LearningPlan).where(LearningPlan.user_id == user.id, LearningPlan.is_active.is_(True))
        .options(selectinload(LearningPlan.items))
    )).scalar_one_or_none()
    return plan


@router.patch("/items/{item_id}", response_model=LearningItemOut)
async def update_item(
    item_id: uuid.UUID,
    payload: ItemUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LearningItem:
    item = (await db.execute(
        select(LearningItem).join(LearningPlan).where(
            LearningItem.id == item_id, LearningPlan.user_id == user.id,
        )
    )).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning item not found")

    from datetime import datetime, timezone
    item.is_complete = payload.is_complete
    item.completed_at = datetime.now(timezone.utc) if payload.is_complete else None
    await db.commit()
    await db.refresh(item)
    return item
