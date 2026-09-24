"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare, Mic, FileText, Briefcase, Pencil, Check, X, ArrowRight, Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/lib/api-client";
import { MetricCard, EmptyState } from "@/components/ui/empty-state";
import { Skeleton, Spinner } from "@/components/ui/spinner";

type ProgressSummary = {
  resume_match_pct: number | null;
  interview_readiness_pct: number | null;
  communication_pct: number | null;
  technical_readiness_pct: number | null;
  recommended_next_action: string | null;
  weakest_areas: string[];
};

const ACTIONS = [
  { href: "/dashboard/interview", label: "Practice an interview", desc: "Questions for your role", icon: MessageSquare, bg: "from-indigo-500 to-indigo-700" },
  { href: "/dashboard/speech-practice", label: "Speech practice", desc: "Six speaking styles", icon: Mic, bg: "from-rose-500 to-pink-600" },
  { href: "/dashboard/resume", label: "Your resume", desc: "Build, upload or view", icon: FileText, bg: "from-emerald-500 to-teal-600" },
  { href: "/dashboard/jobs", label: "Match a job", desc: "See how you fit", icon: Briefcase, bg: "from-amber-500 to-orange-600" },
];

// Suggestions shown under the title field — a starting point, not a list.
const TITLE_IDEAS = ["Software Developer", "Marketing Manager", "Registered Nurse", "Data Analyst", "Teacher", "Product Manager"];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { user, accessToken } = useAuth();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [headline, setHeadline] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    const h = { Authorization: `Bearer ${accessToken}` };
    Promise.all([
      fetch(`${API_URL}/api/v1/progress`, { headers: h }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/api/v1/me`, { headers: h }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([p, me]) => {
        setSummary(p);
        setHeadline(me?.headline ?? null);
        // First visit with no title yet: open the editor straight away.
        if (!me?.headline) setEditing(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  async function saveHeadline(value: string) {
    setSaving(true);
    const res = await fetch(`${API_URL}/api/v1/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ headline: value }),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setHeadline(d.headline ?? null);
      setEditing(false);
    }
  }

  const hasAnyData = summary != null && (summary.resume_match_pct != null || summary.interview_readiness_pct != null);
  const firstName = user?.full_name?.split(" ")[0];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Greeting + title */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-fuchsia-300/20 blur-2xl" />
        <p className="relative text-sm font-medium text-indigo-100">{greeting()}{firstName ? `, ${firstName}` : ""}</p>

        {editing ? (
          <div className="relative mt-2">
            <label htmlFor="headline" className="text-2xl font-semibold sm:text-3xl">I am a…</label>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                id="headline"
                autoFocus
                value={draft}
                maxLength={120}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && draft.trim() && saveHeadline(draft)}
                placeholder="e.g. Frontend Developer"
                className="w-full rounded-xl border-0 bg-white/95 px-4 py-3 text-base text-slate-900 shadow-inner outline-none ring-2 ring-white/40 placeholder:text-slate-400 focus:ring-white sm:max-w-md"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!draft.trim() || saving}
                  onClick={() => saveHeadline(draft)}
                  className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-indigo-700 shadow hover:bg-indigo-50 disabled:opacity-60"
                >
                  {saving ? <Spinner /> : <Check size={16} />} Save
                </button>
                {headline && (
                  <button type="button" onClick={() => setEditing(false)} className="rounded-xl bg-white/15 px-3 py-3 hover:bg-white/25" aria-label="Cancel">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {TITLE_IDEAS.map((t) => (
                <button key={t} type="button" onClick={() => setDraft(t)}
                  className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium hover:bg-white/25">
                  {t}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-indigo-100">
              Interview practice uses this to ask questions that fit your field.
            </p>
          </div>
        ) : (
          <div className="relative mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold sm:text-3xl">I am a {headline}</h1>
            <button type="button" onClick={() => { setDraft(headline ?? ""); setEditing(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
              <Pencil size={13} /> Change
            </button>
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section className="animate-stagger mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ACTIONS.map(({ href, label, desc, icon: Icon, bg }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-slate-800 dark:bg-slate-900"
          >
            <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${bg}`}>
              <Icon size={20} />
            </span>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{label}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              {desc} <ArrowRight size={12} className="transition group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </p>
          </Link>
        ))}
      </section>

      {/* Scores */}
      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-50">Your readiness</h2>
        {loading ? (
          <div className="animate-stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-7 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="animate-stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <MetricCard label="Resume Match" value={summary?.resume_match_pct ?? null} hint="Add a job to see how your resume matches" />
            <MetricCard label="Interview Readiness" value={summary?.interview_readiness_pct ?? null} hint="Complete a practice interview" />
            <MetricCard label="Communication" value={summary?.communication_pct ?? null} hint="Measured from your practice answers" />
            <MetricCard label="Technical Readiness" value={summary?.technical_readiness_pct ?? null} hint="Measured from your practice answers" />
          </div>
        )}
      </section>

      {!loading && !hasAnyData && (
        <div className="mt-6">
          <EmptyState
            title="Nothing to measure yet"
            description="Your readiness scores appear once you've practised. A short interview or speech session takes a few minutes and gives you a baseline to improve on."
            actionLabel="Start your first practice"
            actionHref="/dashboard/interview"
          />
        </div>
      )}

      {!loading && hasAnyData && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="flex gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
            <Sparkles className="shrink-0 text-indigo-600 dark:text-indigo-400" size={22} />
            <div>
              <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Recommended next step</p>
              <p className="mt-0.5 text-sm text-indigo-900/80 dark:text-indigo-200/80">{summary?.recommended_next_action}</p>
            </div>
          </div>
          {!!summary?.weakest_areas.length && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="mb-1.5 text-sm font-semibold text-amber-900 dark:text-amber-200">Areas to work on</p>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-amber-900/80 dark:text-amber-200/80">
                {summary.weakest_areas.slice(0, 4).map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
