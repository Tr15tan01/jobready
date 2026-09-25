"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Crown, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/lib/api-client";

type PlanInfo = {
  key: string;
  name: string;
  price: string;
  speech_topics?: number;
  session_caps: { max_questions: number; max_evaluations: number; max_speech_attempts: number };
  limits: { key: string; limit: number }[];
};

const limitOf = (p: PlanInfo | undefined, key: string) => p?.limits.find((l) => l.key === key)?.limit;
const range = (a?: number, b?: number) => (a == null ? "" : b == null || a === b ? String(a) : `${a}–${b}`);

/**
 * "What paid plans add" for the practice pages. Every number comes from
 * the live plan config (GET /usage/plans), so it can't drift from what the
 * backend enforces. Locked for Free users; shown as included for paid ones.
 */
export function PlanPerks({ kind }: { kind: "interview" | "speech" }) {
  const { accessToken } = useAuth();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/usage/plans`).then((r) => (r.ok ? r.json() : null))
      .then((d) => setPlans(d?.plans ?? [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (!accessToken) return;
    fetch(`${API_URL}/api/v1/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : null)).then((d) => setPlan(d?.plan ?? "free")).catch(() => {});
  }, [accessToken]);

  const free = plans.find((p) => p.key === "free");
  const premium = plans.find((p) => p.key === "premium");
  const pro = plans.find((p) => p.key === "pro");
  if (!free || !premium || !pro || plan == null) return null;

  const paid = plan === "premium" || plan === "pro";
  const delivery = [
    "Eye-contact tracking on video answers",
    "Head movement and composure score",
    "Filler-word count for every answer",
    "Specific notes on framing, gaze and movement",
  ];
  const extras =
    kind === "speech"
      ? [
          `${range(premium.speech_topics, pro.speech_topics)} topics per speech type (Free: ${free.speech_topics})`,
          `Up to ${range(premium.session_caps.max_speech_attempts, pro.session_caps.max_speech_attempts)} scored attempts per topic (Free: ${free.session_caps.max_speech_attempts})`,
          `${range(limitOf(premium, "speech_practice"), limitOf(pro, "speech_practice"))} speech sessions a month (Free: ${limitOf(free, "speech_practice")})`,
        ]
      : [
          `Up to ${range(premium.session_caps.max_questions, pro.session_caps.max_questions)} questions per interview (Free: ${free.session_caps.max_questions})`,
          `${range(premium.session_caps.max_evaluations, pro.session_caps.max_evaluations)} scored answers per session, for more retries (Free: ${free.session_caps.max_evaluations})`,
          `${range(limitOf(premium, "interview_session"), limitOf(pro, "interview_session"))} interviews a month (Free: ${limitOf(free, "interview_session")})`,
          `${range(limitOf(premium, "learning_plan"), limitOf(pro, "learning_plan"))} personalised learning plans a month`,
        ];
  const items = [...delivery, ...extras];

  if (paid) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          <Crown size={14} aria-hidden="true" /> Included in your {plan === "pro" ? "Pro" : "Premium"} plan
        </p>
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" /> {t}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-white dark:border-amber-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-white">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
          <Lock size={14} aria-hidden="true" /> Paid plans only
        </p>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">Locked on Free</span>
      </div>
      <ul className="space-y-2 p-5 pb-3">
        {items.map((t) => (
          <li key={t} className="flex gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <Lock size={11} aria-hidden="true" />
            </span>
            {t}
          </li>
        ))}
      </ul>
      <div className="px-5 pb-5">
        <Link
          href="/dashboard/settings#plans"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-violet-700"
        >
          <Crown size={16} aria-hidden="true" /> Unlock with Premium — {premium.price}
        </Link>
        <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          Or go Pro for {pro.price} and the highest limits.
        </p>
      </div>
    </div>
  );
}
