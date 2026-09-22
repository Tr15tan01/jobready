import secrets
import uuid
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ConfirmPasswordResetRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    RequestPasswordResetRequest,
    TokenResponse,
    UserOut,
    VerifyEmailRequest,
)
from app.services.auth.jwt import get_current_user
from app.services.auth.security import (
    InvalidTokenError,
    TokenType,
    create_access_token,
    create_email_verification_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.services.auth.google_oauth import build_authorization_url, exchange_code_for_profile
from app.services.email.base import send_password_reset_email, send_verification_email

router = APIRouter()

OAUTH_STATE_COOKIE = "jr_oauth_state"


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id, email=user.email, full_name=user.full_name, locale=user.locale,
        is_admin=user.is_admin, email_verified=user.email_verified_at is not None,
    )


def _issue_tokens(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id, user.token_version),
        refresh_token=create_refresh_token(user.id, user.token_version),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: Annotated[AsyncSession, Depends(get_db)]) -> TokenResponse:
    existing = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    user = User(
        email=payload.email, hashed_password=hash_password(payload.password), full_name=payload.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    verify_token = create_email_verification_token(user.id)
    await send_verification_email(user.email, verify_token)

    return _issue_tokens(user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: Annotated[AsyncSession, Depends(get_db)]) -> TokenResponse:
    user = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()

    # Constant-shape error whether the email doesn't exist or the
    # password is wrong — never reveal which (avoids account enumeration).
    invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if user is None or user.hashed_password is None:
        raise invalid
    if not verify_password(payload.password, user.hashed_password):
        raise invalid
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been disabled")

    return _issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: Annotated[AsyncSession, Depends(get_db)]) -> TokenResponse:
    try:
        claims = decode_token(payload.refresh_token, TokenType.REFRESH)
    except InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    try:
        user_id = uuid.UUID(claims.get("sub", ""))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None or not user.is_active or claims.get("tv") != user.token_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is no longer valid")

    # Rotate the refresh token on every use — limits the blast radius if
    # an old refresh token ever leaks.
    return _issue_tokens(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Stateless JWTs can't be individually revoked, so logout bumps the
    user's token_version — this invalidates every access and refresh
    token issued so far, on every device (logout-everywhere). Simple and
    correct; the trade-off is it isn't a single-device-only logout."""
    user.token_version += 1
    await db.commit()


@router.get("/me", response_model=UserOut)
async def get_me(user: Annotated[User, Depends(get_current_user)]) -> UserOut:
    return _user_out(user)


@router.post("/password-reset/request", status_code=status.HTTP_204_NO_CONTENT)
async def request_password_reset(
    payload: RequestPasswordResetRequest, db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    user = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    # Always return 204 whether or not the email exists — otherwise this
    # endpoint becomes an account-enumeration oracle.
    if user is not None and user.hashed_password is not None:
        token = create_password_reset_token(user.id, user.token_version)
        await send_password_reset_email(user.email, token)


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT)
async def confirm_password_reset(
    payload: ConfirmPasswordResetRequest, db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        claims = decode_token(payload.token, TokenType.PASSWORD_RESET)
    except InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    try:
        user_id = uuid.UUID(claims.get("sub", ""))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset link")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None or claims.get("tv") != user.token_version:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link has expired")

    user.hashed_password = hash_password(payload.new_password)
    user.token_version += 1  # invalidate the reset token and every existing session
    await db.commit()


@router.post("/verify-email/resend", status_code=status.HTTP_204_NO_CONTENT)
async def resend_verification_email(user: Annotated[User, Depends(get_current_user)]) -> None:
    if user.email_verified_at is not None:
        return
    token = create_email_verification_token(user.id)
    await send_verification_email(user.email, token)


@router.post("/verify-email/confirm", status_code=status.HTTP_204_NO_CONTENT)
async def confirm_email_verification(
    payload: VerifyEmailRequest, db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        claims = decode_token(payload.token, TokenType.EMAIL_VERIFY)
    except InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification link")

    try:
        user_id = uuid.UUID(claims.get("sub", ""))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification link")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification link")

    from datetime import datetime, timezone
    user.email_verified_at = datetime.now(timezone.utc)
    await db.commit()


# ---- Google OAuth (only usable when GOOGLE_AUTH_ENABLED=1) ---------------

def _require_google_enabled() -> None:
    if not settings.GOOGLE_AUTH_ENABLED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Google sign-in is not enabled")


@router.get("/google/login")
async def google_login(response: Response) -> RedirectResponse:
    _require_google_enabled()
    state = secrets.token_urlsafe(24)
    redirect = RedirectResponse(url=build_authorization_url(state))
    # Short-lived, httpOnly CSRF-state cookie — verified in the callback,
    # then discarded. Not used for session state, only OAuth handshake integrity.
    redirect.set_cookie(OAUTH_STATE_COOKIE, state, httponly=True, max_age=600, samesite="lax")
    return redirect


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    jr_oauth_state: Annotated[str | None, Cookie()] = None,
) -> RedirectResponse:
    _require_google_enabled()
    if not jr_oauth_state or jr_oauth_state != state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")

    try:
        profile = await exchange_code_for_profile(code)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google sign-in failed")

    user = (await db.execute(select(User).where(User.email == profile["email"]))).scalar_one_or_none()
    if user is None:
        from datetime import datetime, timezone
        user = User(
            email=profile["email"], hashed_password=None, full_name=profile.get("name"),
            email_verified_at=datetime.now(timezone.utc) if profile["email_verified"] else None,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif profile["email_verified"] and user.email_verified_at is None:
        from datetime import datetime, timezone
        user.email_verified_at = datetime.now(timezone.utc)
        await db.commit()

    tokens = _issue_tokens(user)
    redirect = RedirectResponse(
        url=f"{settings.FRONTEND_URL}/auth/callback"
            f"?access_token={tokens.access_token}&refresh_token={tokens.refresh_token}"
    )
    redirect.delete_cookie(OAUTH_STATE_COOKIE)
    return redirect
