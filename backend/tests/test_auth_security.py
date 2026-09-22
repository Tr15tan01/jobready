import time
import uuid

import jwt as pyjwt
import pytest

from app.core.config import settings
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


def test_password_hash_and_verify_roundtrip():
    hashed = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", hashed) is True


def test_wrong_password_rejected():
    hashed = hash_password("correct horse battery staple")
    assert verify_password("wrong password", hashed) is False


def test_password_hash_is_never_plaintext():
    hashed = hash_password("my-secret-password")
    assert hashed != "my-secret-password"
    assert hashed.startswith("$2b$")  # bcrypt hash prefix


def test_access_token_roundtrip():
    user_id = uuid.uuid4()
    token = create_access_token(user_id, token_version=0)
    claims = decode_token(token, TokenType.ACCESS)
    assert claims["sub"] == str(user_id)
    assert claims["tv"] == 0
    assert claims["type"] == "access"


def test_refresh_token_roundtrip():
    user_id = uuid.uuid4()
    token = create_refresh_token(user_id, token_version=3)
    claims = decode_token(token, TokenType.REFRESH)
    assert claims["sub"] == str(user_id)
    assert claims["tv"] == 3


def test_wrong_token_type_rejected():
    """An access token must never be accepted where a refresh token is
    expected, and vice versa — this is what stops a leaked access token
    from being replayed as a long-lived refresh token."""
    user_id = uuid.uuid4()
    access = create_access_token(user_id, token_version=0)
    with pytest.raises(InvalidTokenError):
        decode_token(access, TokenType.REFRESH)


def test_email_verify_token_cannot_be_used_as_access_token():
    user_id = uuid.uuid4()
    token = create_email_verification_token(user_id)
    with pytest.raises(InvalidTokenError):
        decode_token(token, TokenType.ACCESS)


def test_password_reset_token_embeds_token_version():
    user_id = uuid.uuid4()
    token = create_password_reset_token(user_id, token_version=5)
    claims = decode_token(token, TokenType.PASSWORD_RESET)
    assert claims["tv"] == 5


def test_tampered_token_rejected():
    user_id = uuid.uuid4()
    token = create_access_token(user_id, token_version=0)
    tampered = token[:-4] + "abcd"
    with pytest.raises(InvalidTokenError):
        decode_token(tampered, TokenType.ACCESS)


def test_token_signed_with_wrong_secret_rejected():
    forged = pyjwt.encode(
        {"sub": str(uuid.uuid4()), "type": "access", "tv": 0, "exp": time.time() + 3600},
        "wrong-secret", algorithm=settings.AUTH_JWT_ALGORITHM,
    )
    with pytest.raises(InvalidTokenError):
        decode_token(forged, TokenType.ACCESS)


def test_expired_token_rejected():
    forged = pyjwt.encode(
        {"sub": str(uuid.uuid4()), "type": "access", "tv": 0, "exp": time.time() - 10},
        settings.AUTH_SECRET, algorithm=settings.AUTH_JWT_ALGORITHM,
    )
    with pytest.raises(InvalidTokenError):
        decode_token(forged, TokenType.ACCESS)
