"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api-client";
import { LoadingButton } from "@/components/ui/spinner";


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`${API_URL}/api/v1/auth/password-reset/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    // Always show the same confirmation, whether or not the email
    // exists — the backend deliberately never reveals that either.
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 dark:bg-slate-950">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">Reset your password</h1>
      <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {sent ? (
        <p className="text-sm text-slate-700 dark:text-slate-300">
          If an account exists for that email, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <LoadingButton type="submit" loading={loading} loadingText="Sending..." className="mt-2 w-full">
          Send reset link
        </LoadingButton>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <a href="/login" className="font-medium text-slate-900 dark:text-slate-100">Back to log in</a>
      </p>
    </main>
  );
}
