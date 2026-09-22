# JobReady Frontend (Next.js 16)

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in NEXT_PUBLIC_API_URL, etc.
npm run dev
```

Runs on http://localhost:3000 and expects the backend at
`NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

## Authentication

Auth is issued and verified entirely by the **backend** — there is no
NextAuth, no frontend-side session provider, and no client secret held
in this app. The frontend is a thin client:

- `src/lib/auth-context.tsx` — `AuthProvider`/`useAuth()`: calls the
  backend's `/api/v1/auth/*` endpoints directly (register, login,
  refresh, logout), holds the access/refresh tokens in `localStorage`,
  and restores/refreshes them on page load.
- Every authenticated request attaches `Authorization: Bearer <access_token>`
  — see any component using `useAuth()` for the pattern.
- Google OAuth is a plain link to `${NEXT_PUBLIC_API_URL}/api/v1/auth/google/login`;
  the backend handles the entire OAuth handshake and redirects back to
  `/auth/callback` on this app with fresh tokens. There is no Google
  client-side SDK or secret here — `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` only
  controls whether the "Continue with Google" link is shown.
- `src/middleware.ts` reads a non-httpOnly `jr_authed` marker cookie to
  redirect obviously-signed-out visitors before a protected page even
  renders. **This is a UX fast-path only** — it is not the security
  boundary. Every API call is independently authorized by the backend,
  which verifies the real access token and rejects anything
  expired/forged/revoked regardless of what this cookie says.

### Auth pages

`/login`, `/register`, `/forgot-password`, `/reset-password?token=...`,
`/verify-email?token=...`, `/auth/callback` (Google OAuth landing page).

## i18n

Translations are hardcoded directly in `src/lib/i18n/config.ts` (not loaded
from external JSON files) for English, Georgian, and Spanish. The selected
language is persisted in a cookie (`jobready_locale`) and read server-side
in `layout.tsx` / `page.tsx`. Add new keys to all three locale blocks in
that file together so the languages never drift apart.

## Known non-blocking notices

- Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`; the app still works under the old name (just a build-time deprecation notice).

## Structure

```
src/app/                  App Router pages (landing, auth, dashboard, legal, admin)
src/lib/auth-context.tsx  AuthProvider / useAuth() — the whole auth client
src/lib/i18n/             Locale config + hardcoded dictionaries
src/components/           Shared UI (voice/camera coaching, speech practice, theme toggle, etc.)
```
