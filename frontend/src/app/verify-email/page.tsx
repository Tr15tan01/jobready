"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/api-client";


function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"pending" | "ok" | "error">("pending");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    fetch(`${API_URL}/api/v1/auth/verify-email/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => setStatus(res.ok ? "ok" : "error"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <p className="text-sm text-slate-700 dark:text-slate-300">
      {status === "pending" && "Verifying your email..."}
      {status === "ok" && "Your email is verified. You can close this tab or head to your dashboard."}
      {status === "error" && "This verification link is invalid or has expired."}
    </p>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center dark:bg-slate-950">
      <h1 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-slate-50">Email verification</h1>
      <Suspense fallback={null}>
        <VerifyEmailInner />
      </Suspense>
      <a href="/dashboard" className="mt-6 text-sm font-medium text-slate-900 dark:text-slate-100">
        Go to dashboard
      </a>
    </main>
  );
}
