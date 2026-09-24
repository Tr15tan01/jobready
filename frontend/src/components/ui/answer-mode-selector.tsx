"use client";

import { Mic, Video, Type } from "lucide-react";

export type AnswerMode = "text" | "voice" | "video";

const MODES: {
  value: AnswerMode;
  label: string;
  hint: string;
  icon: React.ReactNode;
  active: string;
  idle: string;
}[] = [
  {
    value: "text",
    label: "Written",
    hint: "Type your answer. No microphone or camera needed.",
    icon: <Type size={18} />,
    active: "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900",
    idle: "border-slate-200 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300",
  },
  {
    value: "voice",
    label: "Audio",
    hint: "Speak your answer. Audio is transcribed, then discarded — never stored.",
    icon: <Mic size={18} />,
    active: "border-emerald-600 bg-emerald-600 text-white",
    idle: "border-slate-200 text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-300",
  },
  {
    value: "video",
    label: "Video",
    hint: "Speak on camera. Video is analysed on your device and never uploaded — only summary numbers are saved.",
    icon: <Video size={18} />,
    active: "border-violet-600 bg-violet-600 text-white",
    idle: "border-slate-200 text-slate-700 hover:border-violet-400 dark:border-slate-700 dark:text-slate-300",
  },
];

/**
 * Replaces the old radio-plus-checkbox combination, which made "video"
 * look like an add-on to audio rather than its own answer mode and left
 * the camera in a confusing half-started state.
 *
 * Video implies audio: a video answer is still transcribed from the
 * microphone, with on-device visual analysis layered on top.
 */
export function AnswerModeSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: AnswerMode;
  onChange: (mode: AnswerMode) => void;
  disabled?: boolean;
}) {
  const selected = MODES.find((m) => m.value === value);

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        How do you want to answer?
      </p>
      <div role="radiogroup" className="animate-stagger grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
        {MODES.map((mode) => {
          const isActive = value === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              disabled={disabled}
              onClick={() => onChange(mode.value)}
              className={`flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-1.5 break-words rounded-xl border-2 px-2 py-3 text-center text-sm font-medium leading-tight transition-colors disabled:opacity-50 motion-reduce:transition-none ${
                isActive ? mode.active : mode.idle
              }`}
            >
              {mode.icon}
              {mode.label}
            </button>
          );
        })}
      </div>
      {selected && (
        <p aria-live="polite" className="mt-2 min-h-[4.5em] text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {selected.hint}
        </p>
      )}
    </div>
  );
}
