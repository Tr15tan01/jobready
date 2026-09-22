# JobReady

Your **AI Communication & Career Coach**: resume analysis, job matching,
AI-led job-interview practice, and general Speech Practice (persuasive,
impromptu, storytelling, presentation, debate, elevator pitch) — all with
speech/video coaching.

This repo contains **two independently deployable applications**:

```
/frontend   Next.js 16 + TypeScript                → deploy to Vercel
/backend    FastAPI + PostgreSQL + SQLAlchemy    → deploy to Railway/Render/Fly/Cloud Run
```

They communicate **only** over the documented REST API (`/backend/app/api/v1`).
Nothing in the frontend talks to the database or to Gemini directly.

## Status: Phases 1–8 delivered

- ✅ Phase 1 — Foundation: monorepo, 27-table schema, i18n (EN/KA/ES, hardcoded dictionaries), landing/legal pages
- ✅ Phase 2 — Resume ingestion, parsing (PDF/DOCX/TXT), structured extraction, builder, Improve-with-AI accept/reject
- ✅ Phase 3 — Job ingestion, transparent 5-part match scoring, optional embeddings — all profession-neutral (tested against software/psychology/architecture roles)
- ✅ Phase 4 — AI interviewer: lazy question generation, mode-adaptive evaluation (`domain` mode replaces tech-specific "system design")
- ✅ Phase 5 — Speech metrics (accent-neutral) and local-only MediaPipe video coaching — audio/video never stored
- ✅ Phase 6 — Progress tracking and gap-grounded personalized learning plans
- ✅ Phase 7 — Free/Premium/Pro billing via Paddle (hosted checkout + verified webhooks)
- ✅ Phase 8 — Production hardening: rate limiting, admin dashboard, structured logging + request tracing, consistent error handling, optional Sentry, Docker deployment, production checklist
- ✅ Repositioned as **AI Communication & Career Coach** with a dark/light theme toggle and a new **Speech Practice** feature: 6 general communication modes (Persuasive, Impromptu, Storytelling, Presentation, Debate, Elevator Pitch) — random prompt → speak → transcript + speech/video metrics → AI evaluation → score → retry or finish. Dashboard/score displays verified mobile-responsive.

35 backend unit tests pass, covering schema validation, deterministic scoring, prompt profession-neutrality, speech metrics, Paddle webhook signature security, and admin-route authorization — all without a database or real AI calls (see `backend/PRODUCTION_CHECKLIST.md` for what full integration testing against real Postgres requires).

### Honest limitations to know about

- Skill matching (Phase 3) is string-similarity based, not semantic, unless embeddings are enabled — "CBT" won't auto-match "Cognitive Behavioral Therapy."
- Video coaching metrics (Phase 5) are coarse heuristics (yaw estimate, landmark jitter), good for directional coaching, not precise measurement.
- Full integration tests need real Postgres (`docker-compose up postgres`) — the schema's UUID/JSONB/pgvector types aren't faithfully representable in SQLite, so we didn't fake that coverage.

## Roadmap (matches the original phased spec) — all phases complete

1. Foundation
2. Resume ingestion, parsing, builder
3. Job ingestion, matching, embeddings
4. AI interviewer (text + voice), answer evaluation
5. Video coaching (MediaPipe, local processing)
6. Progress tracking, learning plans
7. Free/Premium/Pro billing (Paddle)
8. Production hardening (rate limiting, caching, monitoring, tests, deployment)

## Quick start

See `frontend/README.md` and `backend/README.md` for how to run each app.

## Key architectural decisions

- **Auth**: the backend issues and verifies its own JWTs directly
  (`/api/v1/auth/*`) — no NextAuth or other frontend-side session layer.
  The frontend (`src/lib/auth-context.tsx`) is a thin client that calls
  these endpoints and holds tokens in localStorage. See
  "Authentication" below for the full design and its trade-offs.
- **Google OAuth toggle**: set `GOOGLE_AUTH_ENABLED=1` (frontend + backend
  `.env`) and `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=1` to show the "Continue
  with Google" button; `0` hides it and only email/password is offered.
- **AI cost control**: every Gemini call goes through `AIService`, is
  hashed and cache-checked first, and is logged to `ai_requests` for
  per-user/per-feature cost tracking (see backend `app/services/ai/base.py`).
- **Privacy**: interview video is never stored — only transcripts and
  derived metrics (see `interview_sessions`, `speech_metrics`,
  `visual_metrics` models).
- **Anti-hallucination**: resume AI suggestions are schema-validated and
  must trace back to `candidate_profiles` data or job requirements —
  never invented experience.

## Authentication design

- **Token revocation**: every user has a `token_version` counter embedded
  in each issued token. Logout, password change, and password reset all
  bump it, instantly invalidating every outstanding token for that user —
  a simple, correct way to support logout-everywhere without a token
  blocklist or Redis dependency.
- **Frontend token storage**: access/refresh tokens live in `localStorage`
  (see `frontend/src/lib/auth-context.tsx`), not httpOnly cookies. This is
  a deliberate trade-off — simpler than coordinating cookies across two
  different domains (frontend on Vercel, backend on Railway/Fly/etc.), at
  the cost of tokens being readable by any script able to run on the page
  (i.e. an XSS vulnerability could exfiltrate them). Mitigations already
  in place: short-lived access tokens (30 min default) and
  `token_version` revocation if a token is ever known to be compromised.
  The natural upgrade path, if you need stronger protection, is httpOnly
  cookies issued by the backend with `SameSite=None; Secure`, which
  requires the frontend and backend to share a registrable domain or sit
  behind a shared proxy.
- **Google OAuth**: handled entirely server-side (manual authorization-code
  flow via `httpx`, no client SDK) — the frontend only links to
  `/api/v1/auth/google/login`. The backend exchanges the code, verifies
  the id_token, and redirects to the frontend's `/auth/callback` with
  fresh tokens.
- **`frontend/src/middleware.ts`** redirects obviously-signed-out visitors
  away from `/dashboard` and `/admin` before the page renders, based on a
  non-httpOnly marker cookie — this is a UX fast-path only, not the
  security boundary. Every API call is independently authorized by the
  backend regardless of what that cookie says.

