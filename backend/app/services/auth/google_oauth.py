"""
Manual Google OAuth (authorization code flow), used only when
GOOGLE_AUTH_ENABLED=1. No client-side SDK, no NextAuth - the browser is
redirected to Google, Google redirects back to our own callback with a
code, and this module exchanges that code server-side.
"""
from typing import TypedDict
from urllib.parse import urlencode

import httpx

from app.core.config import settings

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


class GoogleProfile(TypedDict):
    email: str
    email_verified: bool
    name: str | None
    sub: str


def build_authorization_url(state: str) -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_profile(code: str) -> GoogleProfile:
    async with httpx.AsyncClient(timeout=15) as client:
        token_response = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        token_response.raise_for_status()
        id_token = token_response.json()["id_token"]

        # Verifying via Google's tokeninfo endpoint (rather than local
        # signature verification) keeps this dependency-light; it's a
        # network round trip but happens once per login, not per request.
        info_response = await client.get(GOOGLE_TOKENINFO_URL, params={"id_token": id_token})
        info_response.raise_for_status()
        info = info_response.json()

    if info.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise ValueError("Google id_token audience mismatch")

    return GoogleProfile(
        email=info["email"],
        email_verified=info.get("email_verified") in ("true", True),
        name=info.get("name"),
        sub=info["sub"],
    )
