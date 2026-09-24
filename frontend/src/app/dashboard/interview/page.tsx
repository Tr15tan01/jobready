import { InterviewPractice } from "@/components/interview-practice";
import { PracticeTips, WhatWeMeasure } from "@/components/practice-tips";

export default function InterviewPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">Interview Practice</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Realistic questions one at a time, with structured feedback after every answer.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
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
        </div>
      </div>
    </main>
  );
}
