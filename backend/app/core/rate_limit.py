"""
Rate limiting via slowapi. Two tiers, both env-driven (section 41):
  RATE_LIMIT_DEFAULT — applied globally to every request.
  RATE_LIMIT_AI      — applied additionally to endpoints that trigger a
                        Gemini call, as a cheap backstop against abuse
                        beyond the plan-usage limits in services/usage.py.

Keyed by user id when the request is authenticated (so limits track the
candidate, not just their network), falling back to IP address for
unauthenticated endpoints like /auth and the Paddle webhook.
"""
import jwt
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings


def _rate_limit_key(request: Request) -> str:
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:]
        try:
            payload = jwt.decode(
                token, settings.AUTH_SECRET, algorithms=[settings.AUTH_JWT_ALGORITHM],
                options={"verify_exp": False},  # rate-limit key only — real auth check happens separately
            )
            if sub := payload.get("sub"):
                return f"user:{sub}"
        except jwt.PyJWTError:
            pass
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=_rate_limit_key, default_limits=[settings.RATE_LIMIT_DEFAULT])
ai_rate_limit = settings.RATE_LIMIT_AI
