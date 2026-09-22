"use client";

type Point = {
  recorded_at: string;
  overall_score: number;
  technical_score: number | null;
  communication_score: number | null;
  structure_score: number | null;
};

const SERIES: { key: keyof Point; label: string; color: string }[] = [
  { key: "overall_score", label: "Overall", color: "#0f172a" },
  { key: "technical_score", label: "Technical", color: "#2563eb" },
  { key: "communication_score", label: "Communication", color: "#059669" },
  { key: "structure_score", label: "Structure", color: "#d97706" },
];

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = 32;

export function ProgressChart({ history }: { history: Point[] }) {
  const maxScore = 10;
  const stepX = history.length > 1 ? (WIDTH - PADDING * 2) / (history.length - 1) : 0;

  function toPath(key: keyof Point) {
    const points = history
      .map((p, i) => {
        const v = p[key];
        if (v == null) return null;
        const x = PADDING + i * stepX;
        const y = HEIGHT - PADDING - (Number(v) / maxScore) * (HEIGHT - PADDING * 2);
        return `${x},${y}`;
      })
      .filter(Boolean);
    return points.length > 1 ? `M ${points.join(" L ")}` : "";
  }

  return (
    <div className="rounded-xl border border-slate-100 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        <line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
        <line x1={PADDING} y1={PADDING} x2={PADDING} y2={HEIGHT - PADDING} stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
        {SERIES.map((s) => {
          const d = toPath(s.key);
          if (!d) return null;
          return <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth={2} />;
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-3 sm:gap-4 text-xs text-slate-600 dark:text-slate-400">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Interview #{history.length}: <span className="font-medium text-slate-900 dark:text-slate-100">{history[history.length - 1].overall_score}/10</span>
        {history.length > 1 && (
          <> (Interview #1: {history[0].overall_score}/10)</>
        )}
      </p>
    </div>
  );
}
