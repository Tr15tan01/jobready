"use client";

import { useAuth } from "@/lib/auth-context";
import { LoadingButton, LoadingPanel } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "@/lib/api-client";


type Item = { id: string; day_number: number; title: string; description: string | null; is_complete: boolean };
type Plan = { id: string; title: string; items: Item[] };

export function LearningPlanView() {
  const { accessToken: token } = useAuth();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasPracticed, setHasPracticed] = useState<boolean | null>(null);

  const authHeaders = useCallback(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    }),
    [token]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const res = await fetch(`${API_URL}/api/v1/learning-plan`, { headers: authHeaders() });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setPlan(data ?? null);
    }
  }, [token, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  // A plan generated with no interview history has nothing specific to
  // work from and degenerates into generic advice, so check first.
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/v1/progress`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setHasPracticed(Boolean(d && d.history && d.history.length > 0)))
      .catch(() => setHasPracticed(null));
  }, [token]);

  async function generate() {
    setGenerating(true);
    const res = await fetch(`${API_URL}/api/v1/learning-plan/generate`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ days: 7 }),
    });
    setGenerating(false);
    if (res.ok) setPlan(await res.json());
  }

  async function toggleItem(item: Item) {
    const res = await fetch(`${API_URL}/api/v1/learning-plan/items/${item.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ is_complete: !item.is_complete }),
    });
    if (res.ok) await load();
  }

  if (loading) return <LoadingPanel />;

  if (!plan) {
    if (hasPracticed === false) {
      return (
        <EmptyState
          title="Practice first, then we'll build your plan"
          description="A learning plan is built from your actual weak spots — gaps in your resume against a target job, and patterns in your interview answers. Without at least one practice session there's nothing specific to work from, so you'd only get generic advice. Run one session first, then come back."
          actionLabel="Start a practice session"
          actionHref="/dashboard/interview"
        />
      );
    }

    return (
      <div className="rounded-xl border border-slate-100 p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          No plan yet. We&apos;ll build one from your interview results and any resume gaps.
        </p>
        <LoadingButton onClick={generate} loading={generating} loadingText="Building your plan...">
          Generate 7-day plan
        </LoadingButton>
      </div>
    );
  }

  const byDay = [...plan.items].sort((a, b) => a.day_number - b.day_number);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-medium text-slate-900 dark:text-slate-50">{plan.title}</h2>
        <LoadingButton onClick={generate} loading={generating} loadingText="Regenerating..." variant="secondary" className="px-3 py-1.5 text-xs">
          Regenerate
        </LoadingButton>
      </div>
      <div className="space-y-2">
        {byDay.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-4"
          >
            <input
              type="checkbox"
              checked={item.is_complete}
              onChange={() => toggleItem(item)}
              className="mt-1"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Day {item.day_number}</p>
              <p className={`font-medium ${item.is_complete ? "text-slate-400 line-through" : "text-slate-900"}`}>
                {item.title}
              </p>
              {item.description && <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
