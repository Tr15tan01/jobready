import { CheckCircle2, AlertCircle, Mic, ShieldCheck, Cpu, Trash2 } from "lucide-react";

/**
 * Illustrations built from real UI rather than stock photography: they
 * show what the product actually does, stay crisp at every size, follow
 * dark mode, and cost nothing to load.
 */

const BARS = [18, 30, 22, 40, 28, 48, 34, 26, 44, 20, 36, 52, 30, 24, 42, 28, 38, 22, 46, 30, 26, 40];

export function AppPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-indigo-400/30 via-violet-400/20 to-pink-400/30 blur-2xl" />
      <div className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* window chrome */}
        <div className="mb-4 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 text-xs text-slate-400">Interview practice</span>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Behavioral</p>
        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
          Tell me about a time you had to adapt quickly.
        </p>

        {/* waveform */}
        <div className="mt-4 flex h-14 items-center gap-1 rounded-xl bg-slate-50 px-3 dark:bg-slate-800">
          <Mic size={16} className="mr-1 shrink-0 text-rose-500" />
          {BARS.map((h, i) => (
            <span key={i} className="w-1 rounded-full bg-gradient-to-t from-indigo-500 to-pink-400" style={{ height: `${h}%` }} />
          ))}
        </div>

        {/* score */}
        <div className="mt-4 flex items-center gap-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
          <div className="text-center">
            <p className="text-3xl font-bold leading-none">8.4</p>
            <p className="text-[10px] uppercase tracking-wide text-indigo-100">out of 10</p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <span className="text-indigo-100">Pace</span><span className="font-semibold">142 wpm</span>
            <span className="text-indigo-100">Fillers</span><span className="font-semibold">2</span>
            <span className="text-indigo-100">Structure</span><span className="font-semibold">STAR ✓</span>
          </div>
        </div>

        {/* feedback */}
        <ul className="mt-4 space-y-2 text-xs">
          <li className="flex gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-500" /> Clear situation and a specific action you took.
          </li>
          <li className="flex gap-2 text-slate-700 dark:text-slate-300">
            <AlertCircle size={15} className="shrink-0 text-amber-500" /> Add the measurable result at the end.
          </li>
        </ul>
      </div>

      {/* floating chips */}
      <div className="absolute -left-4 top-24 hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium shadow-lg sm:block dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        <span className="text-emerald-600">▲ +12</span> since last week
      </div>
      <div className="absolute -right-4 bottom-20 hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium shadow-lg sm:block dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        Resume match <span className="text-indigo-600">87%</span>
      </div>
    </div>
  );
}

export function PrivacyIllustration() {
  const steps = [
    { icon: Cpu, label: "Analysed on your device", tone: "bg-indigo-600" },
    { icon: ShieldCheck, label: "Video never uploaded", tone: "bg-emerald-600" },
    { icon: Trash2, label: "Audio discarded", tone: "bg-rose-600" },
  ];
  return (
    <div className="mx-auto grid max-w-sm gap-3" aria-hidden="true">
      {steps.map(({ icon: Icon, label, tone }, i) => (
        <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          style={{ marginLeft: `${i * 1.25}rem` }}>
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${tone}`}><Icon size={20} /></span>
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>
          <CheckCircle2 size={18} className="ml-auto text-emerald-500" />
        </div>
      ))}
    </div>
  );
}
