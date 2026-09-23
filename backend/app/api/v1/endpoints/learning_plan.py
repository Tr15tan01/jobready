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
from app.services.usage import check_and_increment_usage

router = APIRouter()


@router.post("/generate", response_model=LearningPlanOut, status_code=status.HTTP_201_CREATED)
async def generate_plan(
    payload: GeneratePlanRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LearningPlan:
    plan_name = user.subscription.plan if user.subscription else "free"
    await check_and_increment_usage(db, user.id, plan_name, "learning_plan")

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

    # Fail honestly. This previously fell back to a single generic item,
    # which hid real generation failures as a mysterious "1-day plan".
    # Checked before touching existing plans, so a failed attempt never
    # replaces a plan the user already had.
    if len(generated.items) < max(1, payload.days // 2):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't build a complete plan just now. Please try again in a moment.",
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
    if payload.is_complete is not None:
        item.is_complete = payload.is_complete
        item.completed_at = datetime.now(timezone.utc) if payload.is_complete else None
    if payload.title is not None:
        item.title = payload.title
    if payload.description is not None:
        item.description = payload.description
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    item = (await db.execute(
        select(LearningItem).join(LearningPlan).where(
            LearningItem.id == item_id, LearningPlan.user_id == user.id,
        )
    )).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning item not found")
    await db.delete(item)
    await db.commit()


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    plan = (await db.execute(
        select(LearningPlan).where(LearningPlan.id == plan_id, LearningPlan.user_id == user.id)
    )).scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning plan not found")
    await db.delete(plan)  # items cascade
    await db.commit()
