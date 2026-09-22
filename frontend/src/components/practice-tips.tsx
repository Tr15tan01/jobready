"use client";

import { useState } from "react";
import { Lightbulb, ChevronLeft, ChevronRight } from "lucide-react";

export type TipSet = "interview" | "speech";

// Static, curated tips — shown instantly, no AI call. Framed as
// observable technique, never as judgements about the person.
const TIPS: Record<TipSet, { title: string; body: string }[]> = {
  interview: [
    { title: "Use the STAR structure", body: "For behavioural questions: Situation, Task, Action, Result. Spend most of your time on the Action — what you specifically did." },
    { title: "Lead with the answer", body: "State your main point in the first sentence, then support it. Interviewers remember openings and conclusions best." },
    { title: "Quantify when you can", body: "\"Cut onboarding time from 3 weeks to 1\" lands harder than \"made onboarding faster\" — but only use numbers you can stand behind." },
    { title: "It's fine to pause", body: "Taking a few seconds to think before answering reads as considered, not unprepared. It also cuts filler words." },
    { title: "Aim for 1–2 minutes", body: "Most answers land best at 60–120 seconds. Long enough for substance, short enough to leave room for follow-ups." },
    { title: "Say \"I\", not \"we\"", body: "Teamwork matters, but interviewers are assessing you. Be clear about your own contribution." },
  ],
  speech: [
    { title: "Open with a hook", body: "A question, a surprising fact, or a short story in the first ten seconds earns the audience's attention." },
    { title: "Signpost your structure", body: "\"I'll make three points...\" gives listeners a map and makes you easier to follow." },
    { title: "Vary your pace", body: "Slow down for key points and pause after them. A steady monotone makes everything sound equally (un)important." },
    { title: "Replace fillers with pauses", body: "When you feel an \"um\" coming, just stop. A one-second silence sounds confident; a filler sounds uncertain." },
    { title: "End deliberately", body: "Close with a clear summary or call to action rather than trailing off. The last line is what people remember." },
    { title: "Practice impromptu with a frame", body: "For unprepared topics, try Point–Reason–Example–Point. It gives structure to any answer in seconds." },
  ],
};

export function PracticeTips({ set }: { set: TipSet }) {
  const tips = TIPS[set];
  const [i, setI] = useState(0);
  const tip = tips[i];

  return (
    <aside className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-orange-950/20">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          <Lightbulb size={14} /> Coaching tip {i + 1}/{tips.length}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous tip"
            onClick={() => setI((i - 1 + tips.length) % tips.length)}
            className="rounded-md p-1 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/40"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Next tip"
            onClick={() => setI((i + 1) % tips.length)}
            className="rounded-md p-1 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <p className="font-medium text-slate-900 dark:text-slate-100">{tip.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{tip.body}</p>
    </aside>
  );
}

/** What-you'll-get panel, so a first-time user knows what the session measures. */
export function WhatWeMeasure({ items }: { items: { color: string; label: string; desc: string }[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        What you&apos;ll get
      </p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex gap-3">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.color}`} />
            <span className="text-sm">
              <span className="font-medium text-slate-900 dark:text-slate-100">{item.label}</span>
              <span className="text-slate-500 dark:text-slate-400"> — {item.desc}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
