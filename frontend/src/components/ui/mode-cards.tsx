"use client";

import type { LucideIcon } from "lucide-react";

export type ModeOption = {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind classes: [icon tile, selected ring/border, selected tint]. */
  tone: { tile: string; ring: string; tint: string };
};

export const TONES = {
  indigo: { tile: "bg-indigo-600", ring: "border-indigo-500 ring-indigo-200 dark:ring-indigo-900", tint: "bg-indigo-50 dark:bg-indigo-950/40" },
  violet: { tile: "bg-violet-600", ring: "border-violet-500 ring-violet-200 dark:ring-violet-900", tint: "bg-violet-50 dark:bg-violet-950/40" },
  emerald: { tile: "bg-emerald-600", ring: "border-emerald-500 ring-emerald-200 dark:ring-emerald-900", tint: "bg-emerald-50 dark:bg-emerald-950/40" },
  amber: { tile: "bg-amber-500", ring: "border-amber-500 ring-amber-200 dark:ring-amber-900", tint: "bg-amber-50 dark:bg-amber-950/40" },
  rose: { tile: "bg-rose-600", ring: "border-rose-500 ring-rose-200 dark:ring-rose-900", tint: "bg-rose-50 dark:bg-rose-950/40" },
  sky: { tile: "bg-sky-600", ring: "border-sky-500 ring-sky-200 dark:ring-sky-900", tint: "bg-sky-50 dark:bg-sky-950/40" },
  pink: { tile: "bg-pink-600", ring: "border-pink-500 ring-pink-200 dark:ring-pink-900", tint: "bg-pink-50 dark:bg-pink-950/40" },
} as const;

export function ModeCards({
  options,
  value,
  onChange,
  disabled = false,
  label,
}: {
  options: ModeOption[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {options.map(({ value: v, label: l, description, icon: Icon, tone }) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(v)}
              className={`group flex flex-col items-start gap-2 rounded-xl border-2 p-3 text-left transition motion-reduce:transition-none disabled:opacity-50 ${
                active
                  ? `${tone.ring} ${tone.tint} ring-4`
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
              }`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm ${tone.tile}`}>
                <Icon size={18} />
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{l}</span>
              <span className="text-xs leading-snug text-slate-500 dark:text-slate-400">{description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
