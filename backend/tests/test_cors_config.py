"""
Trailing slashes in CORS_ORIGINS are an extremely common copy-paste
mistake (browsers show URLs with one). Browsers send the Origin header
WITHOUT a trailing slash and CORSMiddleware matches exactly, so an
un-normalized value silently rejects every preflight.

This caught a real deployment bug.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app.core.config import Settings

ORIGIN = "https://frontend-example.vercel.app"


def _preflight(allow_origins: list[str]):
    app = FastAPI()
    app.add_middleware(CORSMiddleware, allow_origins=allow_origins, allow_credentials=True,
                       allow_methods=["*"], allow_headers=["*"])

    @app.get("/ping")
    def ping():
        return {}

    return TestClient(app).options("/ping", headers={
        "Origin": ORIGIN, "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
    })


def test_trailing_slash_is_stripped():
    s = Settings(CORS_ORIGINS=ORIGIN + "/")
    assert s.cors_origins_list == [ORIGIN]


def test_multiple_origins_each_normalized():
    s = Settings(CORS_ORIGINS=f"{ORIGIN}/ , http://localhost:3000/")
    assert s.cors_origins_list == [ORIGIN, "http://localhost:3000"]


def test_preflight_succeeds_with_slash_in_config():
    """End-to-end: a trailing slash in the env var must still let the
    browser through."""
    s = Settings(CORS_ORIGINS=ORIGIN + "/")
    r = _preflight(s.cors_origins_list)
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == ORIGIN


def test_frontend_url_strips_trailing_slash():
    s = Settings(FRONTEND_URL=ORIGIN + "/")
    assert s.frontend_url == ORIGIN
    assert f"{s.frontend_url}/reset-password" == ORIGIN + "/reset-password"
