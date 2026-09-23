"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/api-client";
import { LoadingButton } from "@/components/ui/spinner";


function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`${API_URL}/api/v1/auth/password-reset/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("This reset link is invalid or has expired.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  if (!token) {
    return <p className="text-sm text-red-600">This reset link is missing a token.</p>;
  }

  if (done) {
    return <p className="text-sm text-slate-700 dark:text-slate-300">Password updated. Redirecting to log in...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="password"
        required
        minLength={8}
        placeholder="New password (min. 8 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <LoadingButton type="submit" loading={loading} loadingText="Saving..." className="mt-2 w-full">
          Set new password
        </LoadingButton>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 dark:bg-slate-950">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-50">Set a new password</h1>
      <Suspense fallback={null}>
        <ResetPasswordInner />
      </Suspense>
    </main>
  );
}
