"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, X, type LucideIcon } from "lucide-react";

/**
 * Top bar for an active practice session. The Cancel button is always
 * there — whatever stage the session is in (camera starting, recording,
 * transcribing, scoring) — and asks once before leaving.
 */
export function SessionHeader({
  icon: Icon,
  label,
  detail,
  onCancel,
  hasScoredAnswers,
}: {
  icon: LucideIcon;
  label: string;
  detail?: string;
  onCancel: () => void;
  /** When true, the confirmation says scored answers are kept. */
  hasScoredAnswers: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="animate-fade-in rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <Icon size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
            {detail && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
          </div>
        </div>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
          >
            <X size={15} aria-hidden="true" /> Cancel session
          </button>
        )}
      </div>
      {confirming && (
        <div role="alertdialog" aria-label="Leave this session?" className="animate-fade-in mt-3 rounded-lg bg-rose-50 p-3 dark:bg-rose-950/30">
          <p className="text-sm font-medium text-rose-900 dark:text-rose-200">Leave this session?</p>
          <p className="mt-0.5 text-xs text-rose-800/80 dark:text-rose-200/80">
            {hasScoredAnswers
              ? "Your scored answers are saved to your progress. Anything in progress right now is discarded."
              : "Nothing from this session will be saved. The camera and microphone switch off straight away."}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-10 items-center rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Yes, leave
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="inline-flex min-h-10 items-center rounded-lg border border-rose-200 px-4 text-sm font-medium text-rose-800 hover:bg-white dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/50"
            >
              Keep practising
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function scoreTone(score: number) {
  if (score >= 8) return { ring: "stroke-emerald-500", text: "Excellent work" };
  if (score >= 6) return { ring: "stroke-indigo-500", text: "Solid — keep going" };
  if (score >= 4) return { ring: "stroke-amber-500", text: "Good start — practice makes the difference" };
  return { ring: "stroke-rose-500", text: "Every rep counts — try again" };
}

/** Results screen shown after Finish, with clear ways to go next. */
export function SessionSummary({
  score,
  stats,
  backLabel,
  onBack,
  onAgain,
  againLabel,
  links = [],
}: {
  score: number | null;
  stats: { label: string; value: string }[];
  backLabel: string;
  onBack: () => void;
  onAgain?: () => void;
  againLabel?: string;
  links?: { href: string; label: string }[];
}) {
  const pct = score != null ? Math.max(0, Math.min(10, score)) / 10 : 0;
  const tone = score != null ? scoreTone(score) : null;
  const C = 2 * Math.PI * 42;

  return (
    <section aria-labelledby="summary-title" className="animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-6 text-center text-white">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          <Trophy size={13} aria-hidden="true" /> Session complete
        </p>
        <div className="relative mx-auto mt-4 h-28 w-28">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" className="stroke-white/20" />
            {score != null && (
              <circle
                cx="50" cy="50" r="42" fill="none" strokeWidth="9" strokeLinecap="round"
                className="stroke-white transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
                strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
              />
            )}
          </svg>
          <p id="summary-title" className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{score != null ? score : "—"}</span>
            <span className="text-xs text-white/80">{score != null ? "out of 10" : "no score"}</span>
          </p>
        </div>
        <p className="mt-3 text-sm font-medium text-white/90">
          {tone ? tone.text : "No answers were scored in this session."}
        </p>
      </div>

      {stats.length > 0 && (
        <dl className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-b border-slate-100 sm:grid-cols-3 sm:divide-y-0 dark:divide-slate-800 dark:border-slate-800">
          {stats.map((s) => (
            <div key={s.label} className="px-4 py-3 text-center">
              <dt className="text-xs text-slate-500 dark:text-slate-400">{s.label}</dt>
              <dd className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <ArrowLeft size={16} aria-hidden="true" /> {backLabel}
        </button>
        {onAgain && againLabel && (
          <button
            type="button"
            onClick={onAgain}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            {againLabel}
          </button>
        )}
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
