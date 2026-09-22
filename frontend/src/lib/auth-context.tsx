"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const ACCESS_TOKEN_KEY = "jr_access_token";
const REFRESH_TOKEN_KEY = "jr_refresh_token";
// Non-httpOnly, non-sensitive marker cookie — lets middleware fast-path
// redirect unauthenticated visits to /dashboard/* before the page even
// renders. It carries no security weight by itself: every API call is
// still authorized independently by the backend using the real access
// token, and a stale/expired token still gets rejected server-side even
// if this cookie is present.
const AUTHED_COOKIE = "jr_authed";

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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function setAuthedCookie(present: boolean) {
  if (present) {
    document.cookie = `${AUTHED_COOKIE}=1; path=/; max-age=2592000; samesite=lax`;
  } else {
    document.cookie = `${AUTHED_COOKIE}=; path=/; max-age=0`;
  }
}

async function fetchMe(accessToken: string): Promise<CurrentUser | null> {
  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTokenRef = useRef<string | null>(null);

  const applyTokens = useCallback(async (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    refreshTokenRef.current = refresh;
    setAccessTokenState(access);
    setAuthedCookie(true);
    const me = await fetchMe(access);
    setUser(me);
  }, []);

  const clearTokens = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    refreshTokenRef.current = null;
    setAccessTokenState(null);
    setUser(null);
    setAuthedCookie(false);
  }, []);

  // On mount: restore tokens from localStorage and try to refresh so a
  // returning visitor with an expired access token doesn't get bounced.
  useEffect(() => {
    async function restore() {
      const storedAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
      refreshTokenRef.current = storedRefresh;

      if (!storedAccess || !storedRefresh) {
        setLoading(false);
        return;
      }

      let me = await fetchMe(storedAccess);
      if (me) {
        setAccessTokenState(storedAccess);
        setUser(me);
        setAuthedCookie(true);
        setLoading(false);
        return;
      }

      // Access token expired/invalid — try the refresh token once.
      const refreshRes = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: storedRefresh }),
      });
      if (refreshRes.ok) {
        const { access_token, refresh_token } = await refreshRes.json();
        await applyTokens(access_token, refresh_token);
      } else {
        clearTokens();
      }
      setLoading(false);
    }
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Proactively refresh the access token before it expires.
  //
  // Access tokens are short-lived (ACCESS_TOKEN_EXPIRE_MINUTES, 30 by
  // default). Without this, a session that stays open past that window
  // starts returning 401s on every authenticated request until the page
  // is reloaded — which is exactly what a long interview or speech
  // practice session looks like. Refreshing on a timer keeps a
  // continuously-open tab working.
  useEffect(() => {
    if (!accessToken) return;

    async function rotate() {
      const refresh = refreshTokenRef.current;
      if (!refresh) return;
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (res.ok) {
          const { access_token, refresh_token } = await res.json();
          await applyTokens(access_token, refresh_token);
        } else {
          // Refresh token itself is dead (expired, or revoked by a
          // logout/password change elsewhere) — clear local state so the
          // user is sent back to /login rather than seeing silent 401s.
          clearTokens();
        }
      } catch {
        // Network blip — leave the current token in place and try again
        // on the next tick rather than logging the user out.
      }
    }

    // Comfortably inside the 30-minute access-token lifetime.
    const interval = setInterval(rotate, 20 * 60 * 1000);

    // A laptop waking from sleep can skip timer ticks entirely, so also
    // re-check whenever the tab becomes visible again.
    function onVisible() {
      if (document.visibilityState === "visible") rotate();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accessToken, applyTokens, clearTokens]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? "Invalid email or password.");
    }
    const { access_token, refresh_token } = await res.json();
    await applyTokens(access_token, refresh_token);
  }, [applyTokens]);

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    const res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? "Could not create your account.");
    }
    const { access_token, refresh_token } = await res.json();
    await applyTokens(access_token, refresh_token);
  }, [applyTokens]);

  const logout = useCallback(async () => {
    if (accessToken) {
      // Best-effort — logout revokes server-side (token_version bump) but
      // we clear local state regardless of whether this call succeeds.
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    }
    clearTokens();
  }, [accessToken, clearTokens]);

  const refreshUser = useCallback(async () => {
    if (!accessToken) return;
    const me = await fetchMe(accessToken);
    setUser(me);
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{ user, accessToken, loading, login, register, logout, setTokens: applyTokens, refreshUser }}
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
