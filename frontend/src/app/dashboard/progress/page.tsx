"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ProgressChart } from "@/components/progress-chart";
import { API_URL } from "@/lib/api-client";


type ProgressSummary = {
  resume_match_pct: number | null;
  interview_readiness_pct: number | null;
  communication_pct: number | null;
  technical_readiness_pct: number | null;
  recent_interview_score: number | null;
  weakest_areas: string[];
  recommended_next_action: string | null;
  history: {
    recorded_at: string;
    overall_score: number;
    technical_score: number | null;
    communication_score: number | null;
    structure_score: number | null;
  }[];
};

export default function ProgressPage() {
  const { accessToken } = useAuth();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${API_URL}/api/v1/progress`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-6 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">Progress</h1>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
      ) : !summary || summary.history.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Complete a practice interview to start tracking your progress over time.
        </p>
      ) : (
        <>
          <ProgressChart history={summary.history} />
          {summary.weakest_areas.length > 0 && (
            <div className="mt-6 rounded-xl border border-slate-100 p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                Recurring weakness: you frequently give correct answers but could sharpen these areas
              </p>
              <ul className="list-inside list-disc text-sm text-slate-600 dark:text-slate-300">
                {summary.weakest_areas.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </main>
  );
}
