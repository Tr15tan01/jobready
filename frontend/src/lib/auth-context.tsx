"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api-client";

const ACCESS_TOKEN_KEY = "jr_access_token";
const REFRESH_TOKEN_KEY = "jr_refresh_token";
const ACTIVITY_KEY = "jr_last_activity";
// Non-httpOnly marker read by middleware for a fast redirect. Carries no
// security weight — the backend authorizes every request independently.
const AUTHED_COOKIE = "jr_authed";

// Signed out after this long with no activity. Must match the backend's
// REFRESH_TOKEN_EXPIRE_HOURS, which enforces the same window server-side.
const IDLE_MS = (Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_HOURS) || 6) * 60 * 60 * 1000;
// Only keep renewing tokens for someone who's actually been active this
// recently. An idle tab stops renewing, so the server-side session lapses too.
const RECENT_ACTIVITY_MS = 15 * 60 * 1000;
// A request slower than this gets a visible "waking up" notice.
const SLOW_REQUEST_MS = 5000;

export type CurrentUser = {
  id: string;
  email: string;
  full_name: string | null;
  locale: string;
  is_admin: boolean;
  email_verified: boolean;
};

type AuthContextValue = {
  user: CurrentUser | null;
  accessToken: string | null;
  loading: boolean;
  /** True while any API request has been pending for a while (e.g. a sleeping server waking up). */
  slow: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  /** Signs out everywhere; with `redirectTo`, leaves via location.replace(). */
  logout: (redirectTo?: string) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Set once a sign-out navigation has started, so guards don't race it with a
// second redirect. Module-level on purpose: it must be readable synchronously.
let leaving = false;
export function isLeaving() {
  return leaving;
}

function setAuthedCookie(present: boolean) {
  document.cookie = present
    ? `${AUTHED_COOKIE}=1; path=/; max-age=2592000; samesite=lax`
    : `${AUTHED_COOKIE}=; path=/; max-age=0`;
}

/** Seconds-since-epoch expiry from a JWT, without verifying it (the server does that). */
function tokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function readActivity(): number {
  const v = Number(localStorage.getItem(ACTIVITY_KEY));
  return Number.isFinite(v) && v > 0 ? v : Date.now();
}

function isProtectedPath() {
  const p = window.location.pathname;
  return p.startsWith("/dashboard") || p.startsWith("/admin");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [slowCount, setSlowCount] = useState(0);

  const accessRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const lastActivityRef = useRef<number>(0);
  const originalFetchRef = useRef<typeof fetch | null>(null);
  // Several requests can fail with 401 at once; they must share ONE refresh,
  // or the first refresh rotates the token and the others fail.
  const refreshInFlight = useRef<Promise<string | null> | null>(null);
  const expiringRef = useRef(false);

  const rawFetch: typeof fetch = (...args) => (originalFetchRef.current ?? fetch)(...args);

  const clearTokens = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    accessRef.current = null;
    refreshTokenRef.current = null;
    setAccessTokenState(null);
    setUser(null);
    setAuthedCookie(false);
  }, []);

  const fetchMe = useCallback(async (token: string): Promise<CurrentUser | null> => {
    const res = await rawFetch(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? res.json() : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTokens = useCallback(async (access: string, refresh: string, loadUser = true) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    accessRef.current = access;
    refreshTokenRef.current = refresh;
    setAccessTokenState(access);
    setAuthedCookie(true);
    if (loadUser) setUser(await fetchMe(access));
  }, [fetchMe]);

  /** Sign out, and send the user to /login with a reason if they were inside the app. */
  const expireSession = useCallback((reason: "idle" | "expired") => {
    if (expiringRef.current) return;
    expiringRef.current = true;
    const protectedPage = isProtectedPath();
    if (protectedPage) leaving = true;
    clearTokens();
    if (protectedPage) window.location.replace(`/login?reason=${reason}`);
    else expiringRef.current = false;
  }, [clearTokens]);

  /** Exchanges the refresh token for a new pair. Deduplicated across callers. */
  const refreshTokens = useCallback(async (): Promise<string | null> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const refresh = refreshTokenRef.current;
    if (!refresh) return null;
    refreshInFlight.current = (async () => {
      try {
        const res = await rawFetch(`${API_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (!res.ok) return null;
        const { access_token, refresh_token } = await res.json();
        await applyTokens(access_token, refresh_token, false);
        return access_token as string;
      } catch {
        return null;
      } finally {
        refreshInFlight.current = null;
      }
    })();
    return refreshInFlight.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyTokens]);

  // ---- Central fetch wrapper --------------------------------------------
  // Every component calls fetch() directly. Rather than change ~20 files,
  // requests to OUR API are wrapped once here:
  //   * a 401 triggers one token refresh and a replay of the request — so a
  //     page left open never gets stuck on an expired token;
  //   * if the refresh fails, the session is over: sign out with a message;
  //   * requests slower than SLOW_REQUEST_MS raise `slow` for the UI.
  useEffect(() => {
    const original = window.fetch.bind(window);
    originalFetchRef.current = original;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (!url.startsWith(API_URL)) return original(input, init);

      let fired = false;
      const timer = setTimeout(() => { fired = true; setSlowCount((c) => c + 1); }, SLOW_REQUEST_MS);
      try {
        let res = await original(input, init);
        const hadAuth = new Headers(init?.headers).has("Authorization");
        const isAuthCall = url.includes("/auth/refresh") || url.includes("/auth/login") || url.includes("/auth/register");
        if (res.status === 401 && hadAuth && !isAuthCall) {
          const fresh = await refreshTokens();
          if (fresh) {
            const headers = new Headers(init?.headers);
            headers.set("Authorization", `Bearer ${fresh}`);
            res = await original(input, { ...init, headers });
          } else {
            expireSession("expired");
          }
        }
        return res;
      } finally {
        clearTimeout(timer);
        if (fired) setSlowCount((c) => Math.max(0, c - 1));
      }
    };
    return () => { window.fetch = original; };
  }, [refreshTokens, expireSession]);

  // ---- Activity tracking -------------------------------------------------
  // Stored in localStorage so all open tabs share one idle clock.
  useEffect(() => {
    lastActivityRef.current = readActivity();
    let lastWrite = 0;
    const mark = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      if (now - lastWrite > 30_000) {
        lastWrite = now;
        localStorage.setItem(ACTIVITY_KEY, String(now));
      }
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVITY_KEY && e.newValue) lastActivityRef.current = Number(e.newValue);
      // Signed out in another tab: sign this tab out too.
      if (e.key === ACCESS_TOKEN_KEY && !e.newValue) {
        clearTokens();
        if (isProtectedPath()) window.location.replace("/login");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark));
      window.removeEventListener("storage", onStorage);
    };
  }, [clearTokens]);

  // ---- Back/forward cache ------------------------------------------------
  // Browsers can restore a page from memory when the user presses Back, as a
  // frozen snapshot — including a dashboard they already signed out of. When
  // that happens, re-check the stored session and leave if it's gone.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      leaving = false;
      const hasSession = !!localStorage.getItem(ACCESS_TOKEN_KEY) && !!localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!hasSession) {
        clearTokens();
        if (isProtectedPath()) window.location.replace("/login");
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [clearTokens]);

  // ---- Session heartbeat -------------------------------------------------
  // Runs every minute and whenever the tab becomes visible again (a sleeping
  // laptop skips timer ticks entirely, so visibility is the reliable hook).
  useEffect(() => {
    if (!accessToken) return;
    function tick() {
      const now = Date.now();
      const idleFor = now - Math.max(lastActivityRef.current, readActivity());
      if (idleFor > IDLE_MS) {
        expireSession("idle");
        return;
      }
      const exp = accessRef.current ? tokenExpiry(accessRef.current) : null;
      const expiringSoon = exp !== null && exp - now < 5 * 60 * 1000;
      // Renew proactively only for active users. Idle users let the token
      // lapse; if they come back within the window, the 401 retry renews it.
      if (expiringSoon && idleFor < RECENT_ACTIVITY_MS) refreshTokens();
    }
    tick();
    const interval = setInterval(tick, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accessToken, refreshTokens, expireSession]);

  // ---- Restore on page load ------------------------------------------------
  useEffect(() => {
    (async () => {
      const storedAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!storedAccess || !storedRefresh) {
        setAuthedCookie(false);
        setLoading(false);
        return;
      }
      // Came back after the idle window (e.g. closed the tab yesterday).
      if (Date.now() - readActivity() > IDLE_MS) {
        clearTokens();
        if (isProtectedPath()) window.location.replace("/login?reason=idle");
        setLoading(false);
        return;
      }
      accessRef.current = storedAccess;
      refreshTokenRef.current = storedRefresh;
      setAccessTokenState(storedAccess);
      setAuthedCookie(true);

      let me = await fetchMe(storedAccess);
      if (!me) {
        const fresh = await refreshTokens();
        me = fresh ? await fetchMe(fresh) : null;
        if (!fresh) clearTokens();
      }
      setUser(me);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSession = useCallback(async (access: string, refresh: string) => {
    expiringRef.current = false;
    leaving = false;
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem(ACTIVITY_KEY, String(now));
    await applyTokens(access, refresh);
  }, [applyTokens]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(typeof body.detail === "string" ? body.detail : "Invalid email or password.");
    }
    const { access_token, refresh_token } = await res.json();
    await startSession(access_token, refresh_token);
  }, [startSession]);

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    const res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(typeof body.detail === "string" ? body.detail : "Could not create your account.");
    }
    const { access_token, refresh_token } = await res.json();
    await startSession(access_token, refresh_token);
  }, [startSession]);

  const logout = useCallback(async (redirectTo?: string) => {
    if (redirectTo) leaving = true;
    const token = accessRef.current;
    if (token) {
      // Best effort: revokes every session server-side (token_version bump).
      await rawFetch(`${API_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    clearTokens();
    localStorage.removeItem(ACTIVITY_KEY);
    if (redirectTo) window.location.replace(redirectTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTokens]);

  const refreshUser = useCallback(async () => {
    if (accessRef.current) setUser(await fetchMe(accessRef.current));
  }, [fetchMe]);

  return (
    <AuthContext.Provider
      value={{
        user, accessToken, loading, slow: slowCount > 0,
        login, register, logout, setTokens: startSession, refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
