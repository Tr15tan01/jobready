"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { MetricCard, EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/spinner";
import { API_URL } from "@/lib/api-client";


type ProgressSummary = {
  resume_match_pct: number | null;
  interview_readiness_pct: number | null;
  communication_pct: number | null;
  technical_readiness_pct: number | null;
  recommended_next_action: string | null;
  weakest_areas: string[];
};

export default function DashboardPage() {
  const { user, accessToken } = useAuth();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    fetch(`${API_URL}/api/v1/progress`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [accessToken]);

  // A brand-new account has no scores at all. Showing four dashes reads
  // like a broken page, so each card explains what will populate it.
  const hasAnyData =
    summary != null &&
    (summary.resume_match_pct != null || summary.interview_readiness_pct != null);

  const metrics = [
    { label: "Resume Match", value: summary?.resume_match_pct ?? null, hint: "Add a job to see how your resume matches" },
    { label: "Interview Readiness", value: summary?.interview_readiness_pct ?? null, hint: "Complete a practice interview" },
    { label: "Communication", value: summary?.communication_pct ?? null, hint: "Measured from your practice answers" },
    { label: "Technical Readiness", value: summary?.technical_readiness_pct ?? null, hint: "Measured from your practice answers" },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-1 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">
        Welcome{user?.full_name ? `, ${user.full_name}` : ""}
      </h1>
      <p className="mb-6 sm:mb-8 text-sm text-slate-500 dark:text-slate-400">
        Here&apos;s where things stand. Upload a resume and a job description to get started.
      </p>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-slate-100 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {metrics.map((m) => (
            <MetricCard key={m.label} label={m.label} value={m.value} hint={m.hint} />
          ))}
        </div>
      )}

      {!loading && !hasAnyData && (
        <div className="mt-6">
          <EmptyState
            title="Nothing to measure yet"
            description="Your readiness scores appear once you've practiced. Start with a short interview or speech session — it takes a few minutes and gives you a baseline to improve on."
            actionLabel="Start your first practice"
            actionHref="/dashboard/speech-practice"
          />
        </div>
      )}

      <div className="mt-8 rounded-xl border border-slate-100 p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Recommended next step</p>
        <p className="mt-1 text-slate-900 dark:text-slate-100">
          {summary?.recommended_next_action ?? "Upload your resume to unlock job matching and interview practice."}
        </p>
      </div>

      {summary && summary.weakest_areas.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-100 p-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Recurring weak areas</p>
          <ul className="list-inside list-disc text-sm text-slate-700 dark:text-slate-300">
            {summary.weakest_areas.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
