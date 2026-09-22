import { SpeechPractice } from "@/components/speech-practice";
import { PracticeTips, WhatWeMeasure } from "@/components/practice-tips";

export default function SpeechPracticePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">Speech Practice</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pick a format, get a random prompt, and speak. Six styles for everyday communication.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <SpeechPractice />
        <div className="space-y-4">
          <PracticeTips set="speech" />
          <WhatWeMeasure
            items={[
              { color: "bg-indigo-500", label: "Overall score", desc: "against criteria for the speech type" },
              { color: "bg-emerald-500", label: "Pace", desc: "words per minute (audio & video)" },
              { color: "bg-amber-500", label: "Filler words", desc: "um, uh, like — language-aware" },
              { color: "bg-violet-500", label: "Eye contact & movement", desc: "video only, analysed on your device" },
            ]}
          />
        </div>
      </div>
    </main>
  );
}
