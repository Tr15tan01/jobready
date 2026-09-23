"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, Check, X, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/lib/api-client";
import { GradientSpinner, LoadingButton, LoadingPanel } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";

type Item = {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  item_type: string;
  is_complete: boolean;
};
type Plan = { id: string; title: string; items: Item[] };

const TYPE_STYLE: Record<string, string> = {
  practice: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
  reading: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  mock_interview: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
};
const TYPE_LABEL: Record<string, string> = {
  practice: "Practice", reading: "Reading", mock_interview: "Mock interview",
};
const LENGTHS = [3, 5, 7, 14];

export function LearningPlanView() {
  const { accessToken: token } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPracticed, setHasPracticed] = useState<boolean | null>(null);
  const [days, setDays] = useState(7);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const headers = useCallback(
    () => ({ ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" }),
    [token]
  );

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/v1/learning-plan`, { headers: headers() });
    if (res.ok) setPlan((await res.json()) ?? null);
    setLoading(false);
  }, [token, headers]);

  useEffect(() => { load(); }, [load]);

  // A plan needs practice history to be specific; without it, it's generic.
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/v1/progress`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setHasPracticed(Boolean(d?.history?.length)))
      .catch(() => setHasPracticed(null));
  }, [token, headers]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/learning-plan/generate`, {
        method: "POST", headers: headers(), body: JSON.stringify({ days }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail ?? "We couldn't build your plan. Please try again.");
        return;
      }
      setPlan(await res.json());
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function patchItem(id: string, body: Partial<Item>) {
    const res = await fetch(`${API_URL}/api/v1/learning-plan/items/${id}`, {
      method: "PATCH", headers: headers(), body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated: Item = await res.json();
      setPlan((p) => p && { ...p, items: p.items.map((i) => (i.id === id ? updated : i)) });
    }
  }

  async function deleteItem(id: string) {
    const res = await fetch(`${API_URL}/api/v1/learning-plan/items/${id}`, { method: "DELETE", headers: headers() });
    if (res.ok) setPlan((p) => p && { ...p, items: p.items.filter((i) => i.id !== id) });
  }

  async function deletePlan() {
    if (!plan) return;
    const res = await fetch(`${API_URL}/api/v1/learning-plan/${plan.id}`, { method: "DELETE", headers: headers() });
    if (res.ok) { setPlan(null); setConfirmDelete(false); }
  }

  function startEdit(item: Item) {
    setEditing(item.id);
    setDraft({ title: item.title, description: item.description ?? "" });
  }

  async function saveEdit(id: string) {
    await patchItem(id, { title: draft.title.trim() || "Untitled", description: draft.description });
    setEditing(null);
  }

  if (loading) return <LoadingPanel label="Loading your plan..." />;

  if (generating) {
    return (
      <div role="status" aria-live="polite" className="animate-fade-in flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <GradientSpinner size={56} />
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">Building your {days}-day plan...</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Looking at your practice results and resume gaps. This usually takes a few seconds.
          </p>
        </div>
      </div>
    );
  }

  const lengthPicker = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-sm text-slate-600 dark:text-slate-300">Plan length:</span>
      {LENGTHS.map((d) => (
        <button
          key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition motion-reduce:transition-none ${
            days === d ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {d} days
        </button>
      ))}
    </div>
  );

  const errorBox = error && (
    <p className="animate-fade-in rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
  );

  if (!plan) {
    if (hasPracticed === false) {
      return (
        <EmptyState
          title="Practice first, then we'll build your plan"
          description="A useful plan is built from your actual weak spots — patterns in your interview answers and gaps against a target job. Without at least one practice session there's nothing specific to work from, so you'd only get generic advice. Run one session, then come back."
          actionLabel="Start a practice session"
          actionHref="/dashboard/interview"
        />
      );
    }
    return (
      <div className="space-y-5 rounded-2xl border border-slate-100 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          We&apos;ll build a day-by-day plan from your interview results and any resume gaps.
        </p>
        {lengthPicker}
        {errorBox}
        <LoadingButton onClick={generate} variant="accent">Generate my plan</LoadingButton>
      </div>
    );
  }

  const items = [...plan.items].sort((a, b) => a.day_number - b.day_number);
  const done = items.filter((i) => i.is_complete).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900 dark:text-slate-50">{plan.title}</h2>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{done}/{items.length} done</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 transition-all duration-500 motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {errorBox}

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="animate-fade-in rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            {editing === item.id ? (
              <div className="space-y-2">
                <input
                  value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Task title"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <textarea
                  value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} aria-label="Task description"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <div className="flex gap-2">
                  <LoadingButton onClick={() => saveEdit(item.id)} variant="success" className="px-3 py-1.5 text-xs"><Check size={14} /> Save</LoadingButton>
                  <LoadingButton onClick={() => setEditing(null)} variant="secondary" className="px-3 py-1.5 text-xs"><X size={14} /> Cancel</LoadingButton>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox" checked={item.is_complete} aria-label={`Mark day ${item.day_number} complete`}
                  onChange={() => patchItem(item.id, { is_complete: !item.is_complete })}
                  className="mt-1 h-5 w-5 shrink-0 accent-indigo-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Day {item.day_number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[item.item_type] ?? TYPE_STYLE.practice}`}>
                      {TYPE_LABEL[item.item_type] ?? item.item_type}
                    </span>
                  </div>
                  <p className={`font-medium ${item.is_complete ? "text-slate-400 line-through" : "text-slate-900 dark:text-slate-100"}`}>{item.title}</p>
                  {item.description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => startEdit(item)} aria-label="Edit task"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800">
                    <Pencil size={15} />
                  </button>
                  <button type="button" onClick={() => deleteItem(item.id)} aria-label="Delete task"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Start over</p>
        {lengthPicker}
        <div className="flex flex-wrap justify-center gap-2">
          <LoadingButton onClick={generate} variant="primary"><RefreshCw size={15} /> New {days}-day plan</LoadingButton>
          {!confirmDelete ? (
            <LoadingButton onClick={() => setConfirmDelete(true)} variant="secondary"><Trash2 size={15} /> Delete plan</LoadingButton>
          ) : (
            <>
              <LoadingButton onClick={deletePlan} variant="danger">Yes, delete it</LoadingButton>
              <LoadingButton onClick={() => setConfirmDelete(false)} variant="secondary">Keep it</LoadingButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
