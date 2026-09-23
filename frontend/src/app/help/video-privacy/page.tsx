import Link from "next/link";
import { Camera, Cpu, BarChart3, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { LogoWordmark } from "@/components/ui/logo";

export const metadata = { title: "How video analysis works — JobReady" };

// Each claim here describes what the code actually does — see
// camera-coach.tsx and voice-recorder.tsx. Keep them in sync.
const STEPS = [
  {
    icon: Camera,
    color: "bg-violet-600",
    title: "Your camera shows you on screen",
    body: "The video stays inside your browser tab. It isn't recorded to a file, and it isn't streamed anywhere.",
  },
  {
    icon: Cpu,
    color: "bg-indigo-600",
    title: "Your device analyses it, frame by frame",
    body: "A face-tracking model downloaded to your browser estimates where your face is and which way it's turned. This runs entirely on your own device.",
  },
  {
    icon: BarChart3,
    color: "bg-emerald-600",
    title: "Only a few summary numbers are kept",
    body: "When you stop recording, the camera switches off and we keep only numbers — like the share of time your face was in frame. No image or frame is ever sent.",
  },
  {
    icon: Trash2,
    color: "bg-rose-600",
    title: "Your audio is transcribed, then discarded",
    body: "Your voice is sent once to be transcribed into text. We keep the text and speaking metrics such as pace. The audio itself is not stored.",
  },
];

const KEPT = [
  "The written transcript of your answer",
  "Speaking pace (words per minute) and filler-word count",
  "Face-in-frame %, gaze-toward-camera %, and a head-movement score",
  "Your score and written feedback",
];
const NEVER = [
  "Any video, image or single frame",
  "Any audio recording",
  "Judgements about personality, honesty, emotion or confidence",
];

export default function VideoPrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Link href="/dashboard"><LogoWordmark size={26} /></Link>
        </div>
      </header>

      <div className="animate-fade-in mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-50">
          How video analysis works
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Video coaching is optional. Here&apos;s exactly what happens when you turn it on.
        </p>

        <ol className="mt-8 space-y-4">
          {STEPS.map(({ icon: Icon, color, title, body }, i) => (
            <li key={title} className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${color}`}>
                <Icon size={22} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step {i + 1}</p>
                <h2 className="font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-50">What we keep</h2>
            <ul className="space-y-2">
              {KEPT.map((k) => (
                <li key={k} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" /> {k}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900 dark:bg-rose-950/30">
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-50">What we never keep</h2>
            <ul className="space-y-2">
              {NEVER.map((k) => (
                <li key={k} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <XCircle size={17} className="mt-0.5 shrink-0 text-rose-600" /> {k}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          The visual measurements are rough coaching signals, affected by lighting and camera
          angle — treat them as a nudge, not a precise score. You can delete everything at any
          time from Settings.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/help/permissions" className="font-medium text-indigo-600 underline dark:text-indigo-400">
            Trouble with camera access? See device instructions
          </Link>
        </p>
      </div>
    </main>
  );
}
