# JobReady Backend (FastAPI)

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in DATABASE_URL, AUTH_SECRET, GEMINI_API_KEY, etc.
```

`AUTH_SECRET` signs and verifies the backend's own JWTs — this is the
only auth secret in the system now (no NextAuth, no shared frontend
secret to keep in sync).

## Database

Requires PostgreSQL 15+. If you set `EMBEDDINGS_ENABLED=1`, also install
the `pgvector` extension (`CREATE EXTENSION vector;`).

```bash
alembic revision --autogenerate -m "init schema"
alembic upgrade head
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

API docs (dev only, `DEBUG=1`): http://localhost:8000/docs

## Authentication

Full email/password + Google OAuth + password reset + email verification,
issued and verified entirely by this backend — see `app/api/v1/endpoints/auth.py`.

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout                    (revokes every session — see token_version below)
POST /api/v1/auth/password-reset/request
POST /api/v1/auth/password-reset/confirm
POST /api/v1/auth/verify-email/resend
POST /api/v1/auth/verify-email/confirm
GET  /api/v1/auth/google/login              (only when GOOGLE_AUTH_ENABLED=1)
GET  /api/v1/auth/google/callback
PATCH  /api/v1/me                           (update profile)
POST   /api/v1/me/change-password
DELETE /api/v1/me                           (delete account — cascades everywhere)
```

Passwords are hashed with `bcrypt` directly (not `passlib` — see the
comment in `app/services/auth/security.py` for why: passlib is
unmaintained and breaks under `bcrypt>=4.1`). Every user has a
`token_version` counter embedded in each issued JWT; logout, password
change, and password reset all bump it, instantly invalidating every
outstanding token for that user.

## Production hardening (Phase 8)

- **Rate limiting** (`app/core/rate_limit.py`): every request is limited by `RATE_LIMIT_DEFAULT`; AI-triggering endpoints (resume upload, interview session creation, and the same pattern should be applied to job extraction/matching, next-question, and voice answers as you extend the app) additionally enforce the stricter `RATE_LIMIT_AI`. Keyed by user id when authenticated, IP otherwise.
- **Request tracing**: every response carries an `X-Request-ID` header; logs are structured JSON lines including that id.
- **Error handling**: unhandled exceptions never leak a stack trace to the client — they're logged server-side with the request id and the client gets a generic message plus that id for support correlation.
- **Observability**: set `SENTRY_DSN` to enable error monitoring; leave blank for a no-op.
- **Admin dashboard**: `/api/v1/admin/*`, gated by `get_current_admin` (requires `users.is_admin = true`, set directly in the DB for your first admin). Covers user list/pagination, activate/disable, plan override, and AI cost/usage stats.

## Docker

```bash
docker compose up postgres redis   # from repo root, for local Postgres + Redis
docker build -t jobready-backend backend/
```

See `../PRODUCTION_CHECKLIST.md` before deploying.

## Tests

```bash
pytest
```

The test suite uses `MockAIService` (see `app/services/ai/base.py`) —
no real Gemini API calls are made during tests, per the project's testing
requirements.

## Environment variables

See `.env.example` — every value is documented there, including all
`GEMINI_MODEL_*` variables, `SPEECH_PROVIDER`, `GOOGLE_AUTH_ENABLED`, and
plan-limit defaults.
