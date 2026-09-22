import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

/**
 * This is a UX fast-path only, not the real security boundary. It reads
 * a non-httpOnly "jr_authed" marker cookie (set by AuthProvider after a
 * successful login) purely to redirect obviously-signed-out visitors to
 * /login before the page renders. It does NOT validate a token — actual
 * authorization happens on every API call against the FastAPI backend,
 * which independently verifies the access token and rejects requests
 * from expired/revoked/forged tokens regardless of what this cookie
 * says. A user could clear cookies and still be blocked by the backend,
 * or spoof this cookie and just see a loading state that fails once the
 * page tries to actually fetch data.
 */
export function middleware(req: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p));
  const isAuthed = req.cookies.get("jr_authed")?.value === "1";

  if (isProtected && !isAuthed) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
