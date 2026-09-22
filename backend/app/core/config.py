"""
Central application configuration.

EVERYTHING that changes between environments (models, limits, providers,
feature flags) lives here and is driven by environment variables.
No AI model name, plan limit, or provider choice should ever be
hard-coded anywhere else in the codebase — import `settings` instead.
"""
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ---- App -----------------------------------------------------------
    APP_NAME: str = "JobReady"
    ENVIRONMENT: str = "development"  # development | staging | production
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # ---- Database / Cache ----------------------------------------------
    DATABASE_URL: str = "postgresql+psycopg://jobready:jobready@localhost:5432/jobready"
    REDIS_URL: str = "redis://localhost:6379/0"

    # ---- Auth ------------------------------------------------------------
    # The backend is the sole source of truth for authentication — it
    # issues and verifies its own JWTs directly (no NextAuth or other
    # frontend-side session layer). Keeps the two apps genuinely
    # independent: any client (web, mobile, another frontend) can
    # authenticate against the same endpoints.
    AUTH_SECRET: str = "change-me-in-production"
    AUTH_JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 48
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # Where the frontend lives — used to build links in verification/reset
    # emails and as the redirect target after Google OAuth completes.
    FRONTEND_URL: str = "http://localhost:3000"

    # Feature flag: 1 = Google OAuth endpoints are registered and usable,
    # 0 = email/password only. Mirrored by the frontend's own env var so
    # the UI knows whether to show the Google button.
    GOOGLE_AUTH_ENABLED: bool = Field(default=False, alias="GOOGLE_AUTH_ENABLED")
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # Email delivery is behind a provider abstraction (services/email/) —
    # "log" (default) just logs the email content/link server-side, which
    # is enough to develop and test the full verification/reset flow
    # without a real SMTP/API key configured.
    EMAIL_PROVIDER: str = "log"

    # ---- CORS ------------------------------------------------------------
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        # Trailing slashes are stripped on purpose. Browsers send the Origin
        # header WITHOUT one ("https://app.vercel.app"), and CORSMiddleware
        # matches exactly — so a copy-pasted "https://app.vercel.app/" would
        # reject every preflight with a 400 and no Allow-Origin header, which
        # the browser reports as an opaque CORS error.
        return [o.strip().rstrip("/") for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def frontend_url(self) -> str:
        """FRONTEND_URL without a trailing slash, so links built as
        f"{frontend_url}/reset-password" never produce a double slash."""
        return self.FRONTEND_URL.strip().rstrip("/")

    # ---- Gemini / AI models (never hard-code a model name elsewhere) ----
    # IMPORTANT: Google closes older models to NEW API keys before their
    # announced shutdown date — the deprecation schedule alone is not
    # enough to tell whether a model works for you. Verify what your own
    # key can reach with:  python -m app.scripts.list_models
    #
    # Current GA lineup (September 2026): 3.8-flash (newest/most capable),
    # 3.7-flash, 3.6-flash (stable workhorse), 3.5-flash-lite (cheapest).
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL_DEFAULT: str = "gemini-3.6-flash"
    GEMINI_MODEL_RESUME: str = "gemini-3.6-flash"
    GEMINI_MODEL_JOB_ANALYSIS: str = "gemini-3.6-flash"
    GEMINI_MODEL_CHAT: str = "gemini-3.6-flash"
    GEMINI_MODEL_INTERVIEW: str = "gemini-3.6-flash"
    # Deeper reasoning for scoring answers — the one place a stronger
    # (pricier) model genuinely earns its cost.
    GEMINI_MODEL_EVALUATION: str = "gemini-3.8-flash"
    # Cheapest tier, used for simple rewrite/suggestion tasks.
    GEMINI_MODEL_FAST: str = "gemini-3.5-flash-lite"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    # gemini-embedding-001 supports Matryoshka truncation (768/1536/3072).
    # This MUST match the pgvector column dimension — changing it after
    # embeddings are stored requires a migration + re-embedding.
    GEMINI_EMBEDDING_DIM: int = 768
    EMBEDDINGS_ENABLED: bool = False

    # Provider selection. "gemini" uses the real API; "mock" returns
    # deterministic empty results so the whole app can be exercised
    # (upload, interview, scoring flows) without an API key or spend.
    AI_PROVIDER: str = "gemini"  # gemini | mock

    # ---- Speech provider (swappable) -------------------------------------
    SPEECH_PROVIDER: str = "gemini"  # gemini | other
    SPEECH_MODEL: str = "gemini-3.6-flash"

    # ---- Storage ----------------------------------------------------------
    STORAGE_PROVIDER: str = "local"  # local | s3 | gcs
    STORAGE_BUCKET: str = "jobready-dev"

    # ---- Billing (Paddle) ------------------------------------------------
    # Provider is swappable (section 24) — everything Paddle-specific is
    # isolated behind app/services/billing/, never referenced elsewhere.
    BILLING_PROVIDER: str = "paddle"
    PADDLE_API_KEY: str = ""
    PADDLE_WEBHOOK_SECRET: str = ""
    PADDLE_ENVIRONMENT: str = "sandbox"  # sandbox | production
    PADDLE_PRICE_ID_PREMIUM: str = ""
    PADDLE_PRICE_ID_PRO: str = ""

    # ---- Observability ------------------------------------------------------
    SENTRY_DSN: str = ""
    POSTHOG_KEY: str = ""

    # ---- Rate limiting --------------------------------------------------
    RATE_LIMIT_DEFAULT: str = "100/minute"
    RATE_LIMIT_AI: str = "20/minute"

    # ---- Plan limits (central config, NOT hard-coded in components) -----
    # These are defaults; production should override via env or the
    # `plan_limits` DB table so limits can change without a deploy.
    FREE_RESUME_ANALYSES_MONTHLY: int = 3
    FREE_JOB_MATCHES_MONTHLY: int = 3
    FREE_INTERVIEW_SESSIONS_MONTHLY: int = 2
    FREE_SPEECH_PRACTICE_MONTHLY: int = 3
    FREE_RESUME_GENERATIONS_MONTHLY: int = 2

    PREMIUM_RESUME_ANALYSES_MONTHLY: int = 30
    PREMIUM_JOB_MATCHES_MONTHLY: int = 30
    PREMIUM_INTERVIEW_SESSIONS_MONTHLY: int = 20
    PREMIUM_SPEECH_PRACTICE_MONTHLY: int = 30
    PREMIUM_RESUME_GENERATIONS_MONTHLY: int = 20

    PRO_RESUME_ANALYSES_MONTHLY: int = 500
    PRO_JOB_MATCHES_MONTHLY: int = 500
    PRO_INTERVIEW_SESSIONS_MONTHLY: int = 200
    PRO_SPEECH_PRACTICE_MONTHLY: int = 500
    PRO_RESUME_GENERATIONS_MONTHLY: int = 200

    # ---- Job match scoring weights (configurable, sum to 1.0) -----------
    MATCH_WEIGHT_REQUIRED_REQUIREMENTS: float = 0.30
    MATCH_WEIGHT_EXPERIENCE: float = 0.25
    MATCH_WEIGHT_TECHNICAL_SKILLS: float = 0.20
    MATCH_WEIGHT_RESPONSIBILITIES: float = 0.15
    MATCH_WEIGHT_PREFERRED: float = 0.10

    # ---- i18n --------------------------------------------------------------
    SUPPORTED_LOCALES: str = "en,ka,es"
    DEFAULT_LOCALE: str = "en"

    @property
    def supported_locales_list(self) -> List[str]:
        return [l.strip() for l in self.SUPPORTED_LOCALES.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
