"""
Admin area (spec section 28): users, plans, usage, AI cost and behaviour.

Every route depends on get_current_admin — enforced by a regression test
(tests/test_admin_security.py). Detail views expose behaviour and
aggregates only, never resume contents or interview transcripts.
"""
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.interview import InterviewSession
from app.models.job import Job
from app.models.progress import AIRequest
from app.models.resume import CandidateProfile, Resume
from app.models.user import AuditLog, Subscription, UsageRecord, User
from app.schemas.admin import (
    AdminStatsOut, AdminUserDetail, AdminUserList, AdminUserOut, AdminUserUpdate,
    DailyPoint, RecentSession,
)
from app.services.auth.jwt import get_current_admin

router = APIRouter()


def _user_out(u: User) -> AdminUserOut:
    return AdminUserOut(
        id=u.id, email=u.email, full_name=u.full_name,
        plan=u.subscription.plan if u.subscription else "free",
        is_active=u.is_active, is_admin=u.is_admin,
        email_verified=u.email_verified_at is not None, created_at=u.created_at,
    )


@router.get("/users", response_model=AdminUserList)
async def list_users(
    _admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    q: Optional[str] = Query(default=None, max_length=200, description="Search email or name"),
    status_filter: Optional[str] = Query(default=None, alias="status", pattern="^(active|disabled)$"),
    plan: Optional[str] = Query(default=None, pattern="^(free|premium|pro)$"),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> AdminUserList:
    """Paginated, searchable, filterable."""
    stmt = select(User)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(User.email.ilike(like), User.full_name.ilike(like)))
    if status_filter == "active":
        stmt = stmt.where(User.is_active.is_(True))
    elif status_filter == "disabled":
        stmt = stmt.where(User.is_active.is_(False))
    if plan == "free":
        stmt = stmt.outerjoin(Subscription, Subscription.user_id == User.id).where(
            or_(Subscription.plan.is_(None), Subscription.plan == "free"))
    elif plan:
        stmt = stmt.join(Subscription, Subscription.user_id == User.id).where(Subscription.plan == plan)

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(
        stmt.order_by(User.created_at.desc()).limit(limit).offset(offset)
    )).scalars().all()
    return AdminUserList(total=total, users=[_user_out(u) for u in rows])


@router.get("/users/{user_id}", response_model=AdminUserDetail)
async def get_user_detail(
    user_id: uuid.UUID,
    _admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminUserDetail:
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    async def scalar(stmt):
        return (await db.execute(stmt)).scalar_one()

    sess = select(InterviewSession).where(InterviewSession.user_id == user_id)
    headline = (await db.execute(
        select(CandidateProfile.headline).where(CandidateProfile.user_id == user_id)
    )).scalar_one_or_none()

    avg = await scalar(select(func.avg(InterviewSession.overall_score)).where(
        InterviewSession.user_id == user_id, InterviewSession.overall_score.is_not(None)))
    last_session = await scalar(select(func.max(InterviewSession.created_at)).where(InterviewSession.user_id == user_id))
    last_ai = await scalar(select(func.max(AIRequest.created_at)).where(AIRequest.user_id == user_id))
    last_active = max([d for d in (last_session, last_ai) if d is not None], default=None)

    period = date.today().replace(day=1)
    usage_rows = (await db.execute(
        select(UsageRecord.feature, UsageRecord.count).where(
            UsageRecord.user_id == user_id, UsageRecord.period == period)
    )).all()

    recent = (await db.execute(
        sess.order_by(InterviewSession.created_at.desc()).limit(10)
    )).scalars().all()

    return AdminUserDetail(
        user=_user_out(target),
        headline=headline,
        resumes=await scalar(select(func.count(Resume.id)).where(Resume.user_id == user_id)),
        jobs=await scalar(select(func.count(Job.id)).where(Job.user_id == user_id)),
        interview_sessions=await scalar(select(func.count()).select_from(
            sess.where(InterviewSession.session_type == "interview").subquery())),
        speech_sessions=await scalar(select(func.count()).select_from(
            sess.where(InterviewSession.session_type == "speech_practice").subquery())),
        completed_sessions=await scalar(select(func.count()).select_from(
            sess.where(InterviewSession.status == "completed").subquery())),
        average_score=round(float(avg), 1) if avg is not None else None,
        ai_requests=await scalar(select(func.count(AIRequest.id)).where(AIRequest.user_id == user_id)),
        ai_cost_usd=round(float(await scalar(select(func.coalesce(func.sum(AIRequest.estimated_cost_usd), 0))
                                             .where(AIRequest.user_id == user_id))), 4),
        last_active=last_active,
        usage_this_month={f: c for f, c in usage_rows},
        recent_sessions=[
            RecentSession(id=s.id, session_type=s.session_type, mode=s.mode, status=s.status,
                          overall_score=s.overall_score, created_at=s.created_at)
            for s in recent
        ],
    )


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminUserOut:
    """Suspend/reactivate an account or override its plan. Every change is
    audit-logged with the acting admin."""
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.is_active is not None:
        if target.id == admin.id and payload.is_active is False:
            # An admin suspending themselves would lock everyone out of the
            # admin area if they were the only admin.
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="You can't suspend your own account.")
        target.is_active = payload.is_active
        if payload.is_active is False:
            # Suspension takes effect immediately: bumping token_version
            # invalidates every session the user currently has open.
            target.token_version += 1
        db.add(AuditLog(actor_user_id=admin.id, action="admin_set_user_active", target_type="user",
                        target_id=target.id, metadata_json={"is_active": payload.is_active}))

    if payload.plan is not None:
        sub = target.subscription
        if sub is None:
            db.add(Subscription(user_id=target.id, plan=payload.plan, status="active"))
        else:
            sub.plan = payload.plan
        db.add(AuditLog(actor_user_id=admin.id, action="admin_set_user_plan", target_type="user",
                        target_id=target.id, metadata_json={"plan": payload.plan}))

    await db.commit()
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one()
    return _user_out(target)


@router.get("/stats", response_model=AdminStatsOut)
async def get_stats(
    _admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminStatsOut:
    async def scalar(stmt):
        return (await db.execute(stmt)).scalar_one()

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    total_users = await scalar(select(func.count(User.id)))
    active_users = await scalar(select(func.count(User.id)).where(User.is_active.is_(True)))
    total_cost = float(await scalar(select(func.coalesce(func.sum(AIRequest.estimated_cost_usd), 0))))

    plan_rows = (await db.execute(select(Subscription.plan, func.count(Subscription.id)).group_by(Subscription.plan))).all()
    by_plan = {"free": 0, "premium": 0, "pro": 0}
    for plan_name, count in plan_rows:
        by_plan[plan_name] = count
    # Users without a subscription row are on the free plan.
    by_plan["free"] += total_users - sum(c for _, c in plan_rows)

    active_7d = await scalar(select(func.count(func.distinct(InterviewSession.user_id)))
                             .where(InterviewSession.created_at >= week_ago))
    avg = await scalar(select(func.avg(InterviewSession.overall_score)).where(InterviewSession.overall_score.is_not(None)))

    return AdminStatsOut(
        total_users=total_users,
        active_users=active_users,
        disabled_users=total_users - active_users,
        new_users_7d=await scalar(select(func.count(User.id)).where(User.created_at >= week_ago)),
        active_users_7d=active_7d,
        users_by_plan=by_plan,
        total_ai_requests=await scalar(select(func.count(AIRequest.id))),
        estimated_ai_spend_usd=round(total_cost, 4),
        cost_per_user_usd=round(total_cost / total_users, 4) if total_users else 0.0,
        cost_by_feature={f: round(float(c), 4) for f, c in (await db.execute(
            select(AIRequest.feature, func.coalesce(func.sum(AIRequest.estimated_cost_usd), 0)).group_by(AIRequest.feature))).all()},
        requests_by_model={m: c for m, c in (await db.execute(
            select(AIRequest.model, func.count(AIRequest.id)).group_by(AIRequest.model))).all()},
        total_interview_sessions=await scalar(select(func.count(InterviewSession.id)).where(InterviewSession.session_type == "interview")),
        total_speech_sessions=await scalar(select(func.count(InterviewSession.id)).where(InterviewSession.session_type == "speech_practice")),
        completed_sessions=await scalar(select(func.count(InterviewSession.id)).where(InterviewSession.status == "completed")),
        average_score=round(float(avg), 1) if avg is not None else None,
        total_resumes=await scalar(select(func.count(Resume.id))),
        total_jobs=await scalar(select(func.count(Job.id))),
    )


@router.get("/activity", response_model=list[DailyPoint])
async def get_activity(
    _admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(default=14, ge=1, le=90),
) -> list[DailyPoint]:
    """Daily signups, sessions and AI spend — every day in the window is
    present, including zero days, so the chart has no gaps."""
    start = datetime.now(timezone.utc).date() - timedelta(days=days - 1)
    since = datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc)

    def by_day(rows):
        return {str(d): v for d, v in rows}

    signups = by_day((await db.execute(
        select(func.date(User.created_at), func.count(User.id))
        .where(User.created_at >= since).group_by(func.date(User.created_at)))).all())
    sessions = by_day((await db.execute(
        select(func.date(InterviewSession.created_at), func.count(InterviewSession.id))
        .where(InterviewSession.created_at >= since).group_by(func.date(InterviewSession.created_at)))).all())
    cost = by_day((await db.execute(
        select(func.date(AIRequest.created_at), func.coalesce(func.sum(AIRequest.estimated_cost_usd), 0))
        .where(AIRequest.created_at >= since).group_by(func.date(AIRequest.created_at)))).all())

    out = []
    for i in range(days):
        key = str(start + timedelta(days=i))
        out.append(DailyPoint(day=key, signups=signups.get(key, 0), sessions=sessions.get(key, 0),
                              ai_cost_usd=round(float(cost.get(key, 0)), 4)))
    return out
