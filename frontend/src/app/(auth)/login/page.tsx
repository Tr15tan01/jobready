"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/lib/api-client";
import { LoadingButton } from "@/components/ui/spinner";
import { AuthLoadingOverlay } from "@/components/auth-loading-overlay";

const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "1";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Only same-site paths: "//evil.com" or "https://…" would be an open redirect.
  const rawCallback = params.get("callbackUrl") ?? "";
  const callbackUrl = rawCallback.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/dashboard";
  const reason = params.get("reason");
  const reasonText =
    reason === "idle"
      ? "You were signed out after a period of inactivity. Please sign in again."
      : reason === "expired"
      ? "Your session expired. Please sign in again."
      : null;
  const { login, user, loading: authLoading } = useAuth();

  // Already signed in (e.g. opened /login in a second tab): skip the form.
  useEffect(() => {
    if (!authLoading && user) router.replace(callbackUrl);
  }, [authLoading, user, router, callbackUrl]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      // replace(): the login form shouldn't sit in the Back history.
      router.replace(callbackUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 dark:bg-slate-950">
      <AuthLoadingOverlay show={loading} title="Signing you in…" />
      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">Welcome back</h1>
      <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">Log in to keep practicing with JobReady.</p>
      {reasonText && (
        <p role="status" className="animate-fade-in -mt-4 mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {reasonText}
        </p>
      )}

      {GOOGLE_AUTH_ENABLED && (
        <>
          <a
            href={`${API_URL}/api/v1/auth/google/login`}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Continue with Google
          </a>
          <div className="mb-4 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            or
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <a href="/forgot-password" className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400">
            Forgot password?
          </a>
        </div>
        <LoadingButton type="submit" loading={loading} loadingText="Logging in..." className="mt-2 w-full">
          Log in
        </LoadingButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        No account? <a href="/register" className="font-medium text-slate-900 dark:text-slate-100">Sign up</a>
      </p>
    </main>
  );
}


// useSearchParams() needs a Suspense boundary so the rest of the page can be
// statically prerendered; without one, `next build` fails on this route.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
