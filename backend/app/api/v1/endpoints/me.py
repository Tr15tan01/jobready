from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.resume import CandidateProfile
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, UpdateProfileRequest
from app.services.auth.jwt import get_current_user
from app.services.auth.security import hash_password, verify_password

router = APIRouter()


async def get_headline(db: AsyncSession, user: User) -> str | None:
    profile = (await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == user.id)
    )).scalar_one_or_none()
    return profile.headline if profile else None


@router.get("")
async def read_me(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    return {
        "headline": await get_headline(db, user),
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "locale": user.locale,
        "email_verified": user.email_verified_at is not None,
        "plan": user.subscription.plan if user.subscription else "free",
    }


@router.patch("")
async def update_profile(
    payload: UpdateProfileRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.locale is not None:
        if payload.locale not in settings.supported_locales_list:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported locale")
        user.locale = payload.locale
    if payload.headline is not None:
        # Stored on the existing candidate profile (created on first use),
        # so no schema migration is needed.
        profile = (await db.execute(
            select(CandidateProfile).where(CandidateProfile.user_id == user.id)
        )).scalar_one_or_none()
        if profile is None:
            profile = CandidateProfile(user_id=user.id)
            db.add(profile)
        profile.headline = payload.headline.strip() or None
    await db.commit()
    await db.refresh(user)
    return {
        "id": str(user.id), "email": user.email, "full_name": user.full_name, "locale": user.locale,
        "headline": await get_headline(db, user),
    }


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    if user.hashed_password is None or not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")
    user.hashed_password = hash_password(payload.new_password)
    user.token_version += 1  # log out every other session on password change
    await db.commit()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Section 30 (privacy): the candidate can delete their account and
    all associated data at any time. Every model FK to users.id cascades
    on delete, so this one delete removes resumes, jobs, interviews,
    metrics, everything - nothing orphaned, nothing retained."""
    await db.delete(user)
    await db.commit()
