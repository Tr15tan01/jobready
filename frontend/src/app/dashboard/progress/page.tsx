"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { ProgressChart } from "@/components/progress-chart";
import {
  ActivityStats, ChartCard, DailyActivityChart, DeliveryTrends, Insights, ScoreDistribution,
  StreakCalendar, TypeBreakdown, WeekdayPattern, type Activity,
} from "@/components/activity-charts";
import { LoadingPanel } from "@/components/ui/spinner";
import { API_URL } from "@/lib/api-client";

const RANGES = [7, 30, 90] as const;


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
  const [activity, setActivity] = useState<Activity | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    const h = { Authorization: `Bearer ${accessToken}` };
    // Always fetch 90 days: the calendar needs 12 weeks, and the range
    // buttons just slice the same data — no refetch per click.
    const tz = new Date().getTimezoneOffset();
    Promise.all([
      fetch(`${API_URL}/api/v1/progress`, { headers: h }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/api/v1/progress/activity?days=90&tz_offset_minutes=${tz}`, { headers: h }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([s, a]) => { setSummary(s); setActivity(a); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const hasAnything = (activity?.totals.answers ?? 0) > 0 || (summary?.history.length ?? 0) > 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">Progress</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your practice habits, scores and delivery over time.</p>
      </div>

      {loading ? (
        <LoadingPanel label="Loading your progress..." />
      ) : !hasAnything || !activity ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <p className="font-medium text-slate-900 dark:text-white">No practice yet</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Answer a few questions and your streak, charts and insights will appear here.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/dashboard/speech-practice" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">Speech practice</Link>
            <Link href="/dashboard/interview" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">Interview practice</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <ActivityStats a={activity} />

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <ChartCard title="Daily activity" subtitle="Answers you gave each day">
              <div className="mb-2 flex gap-1" role="group" aria-label="Date range">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    aria-pressed={range === r}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      range === r
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {r} days
                  </button>
                ))}
              </div>
              <DailyActivityChart daily={activity.daily.slice(-range)} />
            </ChartCard>
            <ChartCard title="Insights" subtitle="What your recent practice shows">
              <Insights insights={activity.insights} />
            </ChartCard>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <ChartCard title="Streak calendar" subtitle="Last 12 weeks — darker means more answers">
              <StreakCalendar daily={activity.daily} />
            </ChartCard>
            <ChartCard title="Average score by practice type" subtitle="Out of 10, across all your answers">
              <TypeBreakdown byType={activity.by_type} />
            </ChartCard>
            <ChartCard title="Score distribution" subtitle="How your answers scored">
              <ScoreDistribution dist={activity.score_distribution} />
            </ChartCard>
            <ChartCard title="When you practise" subtitle="Answers by day of the week">
              <WeekdayPattern weekdays={activity.weekdays} />
            </ChartCard>
          </div>

          <ChartCard title="Delivery trends" subtitle="Weekly averages over the last 8 weeks. Pace's shaded band is the comfortable 120–165 wpm range.">
            <DeliveryTrends weekly={activity.weekly} />
          </ChartCard>

          {summary && summary.history.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Session scores over time</h2>
              <ProgressChart history={summary.history} />
            </div>
          )}

          {summary && summary.weakest_areas.length > 0 && (
            <ChartCard title="Recurring areas to work on" subtitle="Drawn from the feedback on your last five sessions">
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {summary.weakest_areas.map((w) => <li key={w}>{w}</li>)}
              </ul>
              {summary.recommended_next_action && (
                <p className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
                  <span className="font-semibold">Next step:</span> {summary.recommended_next_action}
                </p>
              )}
            </ChartCard>
          )}
        </div>
      )}
    </main>
  );
}
