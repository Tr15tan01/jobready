"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoadingButton } from "@/components/ui/spinner";
import { API_URL } from "@/lib/api-client";
import { AuthLoadingOverlay } from "@/components/auth-loading-overlay";

const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "1";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Only flag a mismatch once the user has actually started the second
  // field — warning on an empty box is just noise.
  const mismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Checked before the request so a typo costs nothing and the user
    // gets an immediate, specific message.
    if (form.password !== form.confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(form.email, form.password, form.fullName || undefined);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 dark:bg-slate-950">
      <AuthLoadingOverlay show={loading} title="Creating your account…" />
      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">Create your account</h1>
      <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">Start preparing smarter, for free.</p>

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
          required
          placeholder="Full name"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (min. 8 characters)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Repeat password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          aria-invalid={mismatch}
          className={`rounded-lg border px-3 py-2.5 text-sm outline-none dark:bg-slate-800 dark:text-slate-100 ${
            mismatch
              ? "border-red-400 focus:border-red-500"
              : "border-slate-200 focus:border-indigo-400 dark:border-slate-700"
          }`}
        />
        {mismatch && (
          <p className="text-xs text-red-600">Passwords don&apos;t match yet.</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <LoadingButton
          type="submit"
          loading={loading}
          loadingText="Creating your account..."
          disabled={mismatch}
          className="mt-2 w-full"
        >
          Create account
        </LoadingButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account? <a href="/login" className="font-medium text-slate-900 dark:text-slate-100">Log in</a>
      </p>
    </main>
  );
}
