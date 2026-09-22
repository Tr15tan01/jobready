# JobReady — Production Checklist

## Before first deploy

- [ ] Set `AUTH_SECRET` (backend) to a long random value, different from the `.env.example` placeholder. This is the only auth secret — the backend issues its own JWTs, so there's nothing to keep in sync with the frontend.
- [ ] Set `ENVIRONMENT=production` on the backend (disables `/docs`/`/redoc`, tightens logging).
- [ ] Set `DEBUG=0` on the backend.
- [ ] `CORS_ORIGINS` set to your real frontend domain(s) only — never `*` in production.
- [ ] `DATABASE_URL` points at a managed Postgres instance with backups enabled.
- [ ] Run `alembic upgrade head` against production before first traffic (the provided `Dockerfile` does this on boot; confirm your platform's release-step behavior if it separates build/release/run).
- [ ] If using embeddings (`EMBEDDINGS_ENABLED=1`), run `CREATE EXTENSION vector;` on the production database first.
- [ ] Set real `GEMINI_API_KEY` and confirm every `GEMINI_MODEL_*` var points at a model your account can access.
- [ ] Set `SPEECH_PROVIDER`/`SPEECH_MODEL` if voice answers are enabled.
- [ ] Paddle: set `PADDLE_ENVIRONMENT=production`, real `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, and the live `PADDLE_PRICE_ID_PREMIUM`/`PADDLE_PRICE_ID_PRO`. Point the Paddle webhook endpoint at `https://<your-api-domain>/api/v1/billing/webhook`.
- [ ] Set `SENTRY_DSN` if you want error monitoring (safe to leave blank — it's a no-op until set).
- [ ] Review `RATE_LIMIT_DEFAULT` / `RATE_LIMIT_AI` for your expected traffic.
- [ ] Confirm `GOOGLE_AUTH_ENABLED` and the matching frontend var agree, and `GOOGLE_CLIENT_ID`/`SECRET` are set if enabling Google sign-in.

## Security

- [ ] Confirm no `.env` files are committed (check `.gitignore`).
- [ ] Confirm `/docs` and `/redoc` are disabled in production (`DEBUG=0`).
- [ ] Rotate `AUTH_SECRET` if it was ever shared in a non-production channel.
- [ ] Verify the Paddle webhook rejects unsigned/tampered requests (see `tests/test_billing.py` — these run against the real signature logic).
- [ ] Confirm at least one user has `is_admin=True` before relying on the admin dashboard (set directly in the DB for the first admin).

## Data & privacy

- [ ] Confirm no interview video/audio ever reaches durable storage — verify `STORAGE_PROVIDER`/`STORAGE_BUCKET` are only used for non-media assets, if used at all.
- [ ] Confirm account deletion cascades correctly (all models use `ondelete="CASCADE"` from `users.id` — verify in a staging DB before go-live).
- [ ] Review `/privacy`, `/terms`, `/cookies` placeholder text with legal counsel before launch.

## Testing

- [ ] `cd backend && pytest` — unit tests cover schema validation, scoring logic, prompt generalization, speech metrics, and billing security. These run without a database or real AI calls.
- [ ] Full integration testing (real Postgres, real endpoint calls) requires a Postgres instance — use `docker-compose up postgres redis` locally or in CI, since the schema uses Postgres-specific types (UUID, JSONB, optionally pgvector) that SQLite can't represent faithfully. Don't rely on SQLite-backed integration tests for this schema.
- [ ] Manually walk the critical path once against a staging environment: register → upload resume → paste job → match → practice interview → complete → check progress → generate learning plan → upgrade plan (Paddle sandbox).

## Deployment

- [ ] Backend: deploy `backend/Dockerfile` to Railway/Render/Fly/Cloud Run (any one).
- [ ] Frontend: deploy `frontend/` to Vercel (or any Next.js host), with `NEXT_PUBLIC_API_URL` pointing at the deployed backend.
- [ ] Confirm the backend's `CORS_ORIGINS` includes the deployed frontend's exact origin.
