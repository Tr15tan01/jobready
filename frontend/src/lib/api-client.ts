const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Header helper for authenticated calls. Components hold `accessToken`
 * from `useAuth()` and pass it here.
 *
 * Token freshness is handled centrally in AuthProvider, which rotates
 * the access token on a timer (and when the tab regains visibility)
 * before its 30-minute lifetime expires. That covers long-running
 * sessions — an interview or speech practice run can easily outlast a
 * single token, and without rotation every request would start
 * returning 401 until the page was reloaded.
 */
export function authHeaders(accessToken: string | null, extra: Record<string, string> = {}) {
  return {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    "Content-Type": "application/json",
    ...extra,
  };
}

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}
