"""
Core auth primitives: password hashing and JWT issuance/verification.
The backend is the sole source of truth for authentication (section 3) —
it signs its own tokens with AUTH_SECRET and verifies them itself.

Token shape:
  access  — short-lived (ACCESS_TOKEN_EXPIRE_MINUTES), used on every API call.
  refresh — sliding idle window (REFRESH_TOKEN_EXPIRE_HOURS), used only to mint a new
            access token. Both embed `tv` (the user's token_version at
            issue time) so logout-everywhere / password-change can
            invalidate every outstanding token by bumping one integer.
"""
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional

import bcrypt
import jwt

from app.core.config import settings

# Using the `bcrypt` library directly rather than passlib: passlib is
# unmaintained (last release 2020) and breaks under bcrypt>=4.1's changed
# metadata exposure. bcrypt's own API is small enough not to need a wrapper.
_BCRYPT_MAX_BYTES = 72  # bcrypt's own hard limit on input length


class TokenType(str, Enum):
    """str-mixin Enum rather than StrEnum (Python 3.11+) — keeps the
    codebase compatible with Python 3.10, which many local dev setups
    still ship (e.g. Windows installs from python.org default to older
    stable releases)."""
    ACCESS = "access"
    REFRESH = "refresh"
    EMAIL_VERIFY = "email_verify"
    PASSWORD_RESET = "password_reset"


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    password_bytes = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    try:
        return bcrypt.checkpw(password_bytes, hashed.encode("utf-8"))
    except ValueError:
        return False


def _create_token(
    *, subject: str, token_type: TokenType, expires_delta: timedelta, extra_claims: Optional[dict] = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": token_type.value,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid.uuid4()),
        **(extra_claims or {}),
    }
    return jwt.encode(payload, settings.AUTH_SECRET, algorithm=settings.AUTH_JWT_ALGORITHM)


def create_access_token(user_id: uuid.UUID, token_version: int) -> str:
    return _create_token(
        subject=str(user_id), token_type=TokenType.ACCESS,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        extra_claims={"tv": token_version},
    )


def create_refresh_token(user_id: uuid.UUID, token_version: int) -> str:
    return _create_token(
        subject=str(user_id), token_type=TokenType.REFRESH,
        expires_delta=timedelta(hours=settings.REFRESH_TOKEN_EXPIRE_HOURS),
        extra_claims={"tv": token_version},
    )


def create_email_verification_token(user_id: uuid.UUID) -> str:
    return _create_token(
        subject=str(user_id), token_type=TokenType.EMAIL_VERIFY,
        expires_delta=timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS),
    )


def create_password_reset_token(user_id: uuid.UUID, token_version: int) -> str:
    # Embeds token_version too: resetting a password should invalidate
    # any reset link generated before an even more recent password change.
    return _create_token(
        subject=str(user_id), token_type=TokenType.PASSWORD_RESET,
        expires_delta=timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES),
        extra_claims={"tv": token_version},
    )


class InvalidTokenError(Exception):
    pass


def decode_token(token: str, expected_type: TokenType) -> dict:
    try:
        payload = jwt.decode(token, settings.AUTH_SECRET, algorithms=[settings.AUTH_JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise InvalidTokenError(str(exc)) from exc

    if payload.get("type") != expected_type.value:
        raise InvalidTokenError(f"Expected a {expected_type.value} token")
    return payload
