"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setTokens } = useAuth();
  const [error, setError] = useState(false);

  useEffect(() => {
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) {
      setError(true);
      return;
    }
    setTokens(accessToken, refreshToken).then(() => router.replace("/dashboard"));
  }, [params, router, setTokens]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 dark:bg-slate-950">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {error ? "Sign-in failed. Please try again." : "Signing you in..."}
      </p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
