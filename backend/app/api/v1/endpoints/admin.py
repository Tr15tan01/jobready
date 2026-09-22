import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.interview import InterviewSession
from app.models.job import Job
from app.models.progress import AIRequest
from app.models.resume import Resume
from app.models.user import AuditLog, Subscription, User
from app.schemas.admin import AdminStatsOut, AdminUserOut, AdminUserUpdate
from app.services.auth.jwt import get_current_admin

router = APIRouter()


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    _admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    """Paginated (section 31) — never dumps the whole user table at once."""
    result = await db.execute(
        select(User, Subscription.plan)
        .outerjoin(Subscription, Subscription.user_id == User.id)
        .order_by(User.created_at.desc())
        .limit(limit).offset(offset)
    )
    rows = result.all()
    return [
        AdminUserOut(
            id=u.id, email=u.email, full_name=u.full_name, plan=plan or "free",
            is_active=u.is_active, is_admin=u.is_admin, created_at=u.created_at,
        )
        for u, plan in rows
    ]


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Disable/reactivate an account or override its plan (section 28).
    Never exposes candidate content — only account-level fields."""
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.is_active is not None:
        target.is_active = payload.is_active
        db.add(AuditLog(
            actor_user_id=admin.id, action="admin_set_user_active", target_type="user",
            target_id=target.id, metadata_json={"is_active": payload.is_active},
        ))

    if payload.plan is not None:
        sub = (await db.execute(select(Subscription).where(Subscription.user_id == target.id))).scalar_one_or_none()
        if sub is None:
            sub = Subscription(user_id=target.id, plan=payload.plan, status="active")
            db.add(sub)
        else:
            sub.plan = payload.plan
        db.add(AuditLog(
            actor_user_id=admin.id, action="admin_set_user_plan", target_type="user",
            target_id=target.id, metadata_json={"plan": payload.plan},
        ))

    await db.commit()
    await db.refresh(target)
    sub = (await db.execute(select(Subscription).where(Subscription.user_id == target.id))).scalar_one_or_none()
    return AdminUserOut(
        id=target.id, email=target.email, full_name=target.full_name,
        plan=sub.plan if sub else "free", is_active=target.is_active,
        is_admin=target.is_admin, created_at=target.created_at,
    )


@router.get("/stats", response_model=AdminStatsOut)
async def get_stats(
    _admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminStatsOut:
    """AI cost/usage dashboard (section 27) — the numbers that keep the
    product's economics sane."""
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active.is_(True)))).scalar_one()

    total_ai_requests = (await db.execute(select(func.count(AIRequest.id)))).scalar_one()
    total_cost = (await db.execute(select(func.coalesce(func.sum(AIRequest.estimated_cost_usd), 0)))).scalar_one()

    cost_by_feature_rows = (await db.execute(
        select(AIRequest.feature, func.coalesce(func.sum(AIRequest.estimated_cost_usd), 0))
        .group_by(AIRequest.feature)
    )).all()
    requests_by_model_rows = (await db.execute(
        select(AIRequest.model, func.count(AIRequest.id)).group_by(AIRequest.model)
    )).all()

    total_sessions = (await db.execute(select(func.count(InterviewSession.id)))).scalar_one()
    total_resumes = (await db.execute(select(func.count(Resume.id)))).scalar_one()
    total_jobs = (await db.execute(select(func.count(Job.id)))).scalar_one()

    return AdminStatsOut(
        total_users=total_users,
        active_users=active_users,
        total_ai_requests=total_ai_requests,
        estimated_ai_spend_usd=round(float(total_cost), 4),
        cost_by_feature={f: round(float(c), 4) for f, c in cost_by_feature_rows},
        requests_by_model={m: c for m, c in requests_by_model_rows},
        total_interview_sessions=total_sessions,
        total_resumes=total_resumes,
        total_jobs=total_jobs,
    )
