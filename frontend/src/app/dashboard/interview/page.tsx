import { InterviewPractice } from "@/components/interview-practice";
import Link from "next/link";
import { BookMarked } from "lucide-react";
import { PracticeTips, WhatWeMeasure } from "@/components/practice-tips";
import { PlanPerks } from "@/components/plan-perks";
import { INTERVIEW_TIPS_SLUG } from "@/lib/tips-slugs";

export default function InterviewPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">Interview Practice</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Realistic questions one at a time, with structured feedback after every answer.
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <InterviewPractice />
        <div className="animate-stagger space-y-4">
          <PracticeTips set="interview" />
          <WhatWeMeasure
            items={[
              { color: "bg-indigo-500", label: "Score out of 10", desc: "judged against criteria that fit your field" },
              { color: "bg-emerald-500", label: "Strengths", desc: "what worked, so you keep doing it" },
              { color: "bg-amber-500", label: "Improvements", desc: "specific, actionable changes" },
              { color: "bg-violet-500", label: "Stronger answer", desc: "a rewrite using only your own points" },
            ]}
          />
          <PlanPerks kind="interview" />
          <Link
            href={`/tips/${INTERVIEW_TIPS_SLUG}`}
            className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-900 transition-colors hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200 dark:hover:bg-orange-900/30"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white"><BookMarked size={17} aria-hidden="true" /></span>
            How to answer interview questions →
          </Link>
        </div>
      </div>
    </main>
  );
}
