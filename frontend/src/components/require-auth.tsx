"use client";

import { useEffect } from "react";
import { isLeaving, useAuth } from "@/lib/auth-context";
import { GradientSpinner } from "@/components/ui/spinner";

/**
 * Client-side gate for signed-in areas. The backend is the real security
 * boundary (every API call is verified there); this makes sure the UI never
 * shows a signed-in screen without a session — e.g. after pressing Back
 * following a logout — and leaves via replace() so the page isn't kept in
 * the Back history.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken, loading } = useAuth();

  useEffect(() => {
    if (!loading && !accessToken && !isLeaving()) {
      const next = encodeURIComponent(window.location.pathname);
      window.location.replace(`/login?callbackUrl=${next}`);
    }
  }, [loading, accessToken]);

  if (!accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950" role="status" aria-label="Checking your session">
        <GradientSpinner size={44} />
      </div>
    );
  }
  return <>{children}</>;
}
