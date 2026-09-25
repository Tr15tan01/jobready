import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

/**
 * UX fast-path only, not the security boundary. It reads the non-httpOnly
 * "jr_authed" marker cookie (set by AuthProvider after sign-in) to redirect
 * obviously signed-out visitors before the page renders. Real authorization
 * happens on every API call in the FastAPI backend.
 *
 * Signed-in pages are also marked no-store so the browser can't show a cached
 * copy from its Back history after the user has logged out.
 */
export function proxy(req: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p));
  const isAuthed = req.cookies.get("jr_authed")?.value === "1";

  if (isProtected && !isAuthed) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  const res = NextResponse.next();
  if (isProtected) res.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
