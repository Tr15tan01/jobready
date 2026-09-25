"use client";

import { useState } from "react";
import { Flame, Trophy, CalendarDays, Clock, Target, Star, TrendingUp, Lightbulb, Info } from "lucide-react";

export type Activity = {
  days: number;
  daily: { day: string; sessions: number; answers: number; minutes: number; avg_score: number | null }[];
  streak: { current: number; longest: number; practised_today: boolean };
  totals: {
    sessions: number; completed_sessions: number; answers: number; scored_answers: number;
    practice_minutes: number; active_days: number; best_score: number | null;
    average_score: number | null; active_days_last_7: number;
  };
  by_type: { kind: string; mode: string; label: string; sessions: number; answers: number; avg_score: number | null }[];
  score_distribution: { range: string; count: number }[];
  weekdays: { day: string; answers: number }[];
  weekly: { week: string; avg_score: number | null; wpm: number | null; fillers: number | null; eye_contact: number | null }[];
  insights: { tone: "positive" | "tip" | "neutral"; text: string }[];
};

// One series colour (the chart palette's slot 1), stepped for dark mode.
const BAR = "fill-[#2a78d6] dark:fill-[#3987e5]";
const BAR_BG = "bg-[#2a78d6] dark:bg-[#3987e5]";
const STROKE = "stroke-[#2a78d6] dark:stroke-[#3987e5]";

const fmtDay = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, opts);

function Card({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Headline numbers. */
export function ActivityStats({ a }: { a: Activity }) {
  const tiles = [
    { icon: Flame, label: "Current streak", value: `${a.streak.current} day${a.streak.current === 1 ? "" : "s"}`,
      sub: a.streak.practised_today ? "Practised today ✓" : a.streak.current > 0 ? "Practise today to extend it" : "Start one today", tile: "bg-orange-500" },
    { icon: Trophy, label: "Longest streak", value: `${a.streak.longest} day${a.streak.longest === 1 ? "" : "s"}`, sub: "Your personal best", tile: "bg-amber-500" },
    { icon: CalendarDays, label: "Active days", value: String(a.totals.active_days), sub: `${a.totals.active_days_last_7} in the last 7 days`, tile: "bg-sky-600" },
    { icon: Clock, label: "Speaking time", value: `${Math.round(a.totals.practice_minutes)} min`, sub: `${a.totals.answers} answers in total`, tile: "bg-violet-600" },
    { icon: Target, label: "Average score", value: a.totals.average_score != null ? `${a.totals.average_score}/10` : "—", sub: `${a.totals.scored_answers} scored answers`, tile: "bg-indigo-600" },
    { icon: Star, label: "Best score", value: a.totals.best_score != null ? `${a.totals.best_score}/10` : "—", sub: `${a.totals.completed_sessions} sessions finished`, tile: "bg-emerald-600" },
  ];
  return (
    <div className="animate-stagger grid grid-cols-2 gap-3 lg:grid-cols-3">
      {tiles.map(({ icon: Icon, label, value, sub, tile }) => (
        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${tile}`}><Icon size={16} aria-hidden="true" /></span>
          </div>
          <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>
        </div>
      ))}
    </div>
  );
}

/** Answers per day, with a hover/focus readout. */
export function DailyActivityChart({ daily }: { daily: Activity["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...daily.map((d) => d.answers));
  const W = 600, H = 160, gap = daily.length > 40 ? 1 : 2;
  const bw = (W - gap * (daily.length - 1)) / daily.length;
  const h = hover != null ? daily[hover] : null;
  const labelEvery = Math.ceil(daily.length / 6);

  return (
    <div>
      <div className="mb-2 h-10 text-xs" aria-live="polite">
        {h ? (
          <p className="text-slate-700 dark:text-slate-200">
            <strong className="text-base text-slate-900 dark:text-white">{h.answers}</strong> answer{h.answers === 1 ? "" : "s"} · {h.sessions} session{h.sessions === 1 ? "" : "s"}
            {h.avg_score != null && <> · avg <strong>{h.avg_score}</strong>/10</>}
            {h.minutes > 0 && <> · {h.minutes} min</>}
            <span className="block text-slate-500 dark:text-slate-400">{fmtDay(h.day, { weekday: "long", day: "numeric", month: "long" })}</span>
          </p>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">Hover or tap a bar for details.</p>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label="Answers per day">
        {[0.5, 1].map((f) => (
          <line key={f} x1={0} x2={W} y1={H - f * (H - 18)} y2={H - f * (H - 18)} className="stroke-slate-100 dark:stroke-slate-800" strokeWidth={1} />
        ))}
        <line x1={0} x2={W} y1={H} y2={H} className="stroke-slate-300 dark:stroke-slate-700" strokeWidth={1} />
        {daily.map((d, i) => {
          const bh = d.answers ? Math.max(3, (d.answers / max) * (H - 18)) : 0;
          const x = i * (bw + gap);
          return (
            <g key={d.day}>
              {/* Tall invisible hit target, bigger than the mark. */}
              <rect
                x={x} y={0} width={bw + gap} height={H}
                className="cursor-pointer fill-transparent outline-none"
                tabIndex={0}
                aria-label={`${fmtDay(d.day)}: ${d.answers} answers`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => setHover(i)}
              />
              {bh > 0 && (
                <rect
                  x={x} y={H - bh} width={bw} height={bh} rx={Math.min(3, bw / 2)}
                  className={`${BAR} pointer-events-none transition-opacity ${hover != null && hover !== i ? "opacity-40" : ""}`}
                />
              )}
              {i % labelEvery === 0 && (
                <text x={i === 0 ? x : x + bw / 2} y={H + 14} textAnchor={i === 0 ? "start" : "middle"} className="fill-slate-500 text-[10px] dark:fill-slate-400">
                  {fmtDay(d.day)}
                </text>
              )}
            </g>
          );
        })}
        <text x={2} y={10} textAnchor="start" className="fill-slate-400 text-[10px]">{`max ${max}`}</text>
      </svg>
    </div>
  );
}

/** GitHub-style calendar of the last 12 weeks — the streak made visible. */
export function StreakCalendar({ daily }: { daily: Activity["daily"] }) {
  const days = daily.slice(-84);
  const max = Math.max(1, ...days.map((d) => d.answers));
  // Pad so the first column starts on Monday.
  const first = new Date(`${days[0]?.day}T12:00:00`);
  const pad = days.length ? (first.getDay() + 6) % 7 : 0;
  const cells: (Activity["daily"][number] | null)[] = [...Array(pad).fill(null), ...days];
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
  const shades = [
    "bg-slate-100 dark:bg-slate-800",
    "bg-[#2a78d6]/25 dark:bg-[#3987e5]/30",
    "bg-[#2a78d6]/50 dark:bg-[#3987e5]/55",
    "bg-[#2a78d6]/75 dark:bg-[#3987e5]/80",
    BAR_BG,
  ];
  return (
    <div>
      <div className="grid grid-flow-col grid-rows-7 gap-1" role="img" aria-label="Practice calendar for the last 12 weeks">
        {cells.map((c, i) =>
          c ? (
            <span
              key={c.day}
              title={`${fmtDay(c.day, { weekday: "short", day: "numeric", month: "short" })}: ${c.answers} answer${c.answers === 1 ? "" : "s"}`}
              className={`aspect-square w-full min-w-0 rounded-[3px] ${shades[level(c.answers)]}`}
            />
          ) : (
            <span key={`pad-${i}`} className="aspect-square w-full" />
          )
        )}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-500 dark:text-slate-400">
        Less {shades.map((s, i) => <span key={i} className={`h-2.5 w-2.5 rounded-[2px] ${s}`} />)} More
      </div>
    </div>
  );
}

/** Horizontal bars: a label, a bar, a value — for magnitudes by category. */
function HBars({ rows, max, unit = "" }: { rows: { label: string; value: number | null; note?: string }[]; max: number; unit?: string }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate font-medium text-slate-700 dark:text-slate-300">{r.label}</span>
            <span className="shrink-0 text-slate-900 dark:text-white">
              <strong>{r.value != null ? `${r.value}${unit}` : "—"}</strong>
              {r.note && <span className="ml-1 text-slate-500 dark:text-slate-400">{r.note}</span>}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className={`h-2 rounded-full ${BAR_BG}`} style={{ width: `${r.value != null ? Math.max(2, (r.value / max) * 100) : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TypeBreakdown({ byType }: { byType: Activity["by_type"] }) {
  if (!byType.length) return <p className="text-sm text-slate-500 dark:text-slate-400">No sessions yet.</p>;
  return (
    <HBars
      max={10}
      unit="/10"
      rows={byType.map((t) => ({ label: t.label, value: t.avg_score, note: `· ${t.sessions} session${t.sessions === 1 ? "" : "s"}` }))}
    />
  );
}

/** Vertical columns with the count above each. */
function Columns({ rows, ariaLabel }: { rows: { label: string; value: number }[]; ariaLabel: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex h-36 items-end gap-2" role="img" aria-label={ariaLabel}>
      {rows.map((r) => (
        <div key={r.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{r.value}</span>
          <div className={`w-full max-w-10 rounded-t ${BAR_BG}`} style={{ height: `${r.value ? Math.max(3, (r.value / max) * 100) : 0}%` }} />
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ScoreDistribution({ dist }: { dist: Activity["score_distribution"] }) {
  return <Columns rows={dist.map((d) => ({ label: d.range, value: d.count }))} ariaLabel="How many answers scored in each range" />;
}

export function WeekdayPattern({ weekdays }: { weekdays: Activity["weekdays"] }) {
  return <Columns rows={weekdays.map((d) => ({ label: d.day, value: d.answers }))} ariaLabel="Answers by day of the week" />;
}

/** A single small line chart — one measure, one axis. */
function Sparkline({
  title, points, unit = "", band, domain,
}: {
  title: string;
  points: { week: string; value: number | null }[];
  unit?: string;
  band?: [number, number];
  domain?: [number, number];
}) {
  const vals = points.map((p) => p.value).filter((v): v is number => v != null);
  const W = 240, H = 70, P = 6;
  const lo = domain ? domain[0] : Math.min(...vals, band?.[0] ?? Infinity) * 0.9;
  const hi = domain ? domain[1] : Math.max(...vals, band?.[1] ?? -Infinity) * 1.1;
  const x = (i: number) => P + (i / Math.max(1, points.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - lo) / Math.max(1e-6, hi - lo)) * (H - 2 * P);
  const segs = points.map((p, i) => (p.value != null ? `${x(i)},${y(p.value)}` : null));
  const path = segs.filter(Boolean).length > 1 ? `M ${segs.filter(Boolean).join(" L ")}` : "";
  const last = [...points].reverse().find((p) => p.value != null);

  return (
    <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{title}</p>
        <p className="text-sm font-bold text-slate-900 dark:text-white">{last?.value != null ? `${last.value}${unit}` : "—"}</p>
      </div>
      {vals.length === 0 ? (
        <p className="mt-4 text-xs text-slate-400">No data yet</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label={`${title} by week`}>
          {band && (
            <rect x={0} width={W} y={y(band[1])} height={Math.max(0, y(band[0]) - y(band[1]))} className="fill-emerald-500/10" />
          )}
          {path && <path d={path} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className={STROKE} />}
          {points.map((p, i) => p.value != null && (
            <circle key={p.week} cx={x(i)} cy={y(p.value)} r={3.5} className={`${BAR} stroke-white dark:stroke-slate-900`} strokeWidth={1.5}>
              <title>{`Week of ${fmtDay(p.week)}: ${p.value}${unit}`}</title>
            </circle>
          ))}
        </svg>
      )}
    </div>
  );
}

export function DeliveryTrends({ weekly }: { weekly: Activity["weekly"] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Sparkline title="Average score" unit="/10" domain={[0, 10]} points={weekly.map((w) => ({ week: w.week, value: w.avg_score }))} />
      <Sparkline title="Speaking pace" unit=" wpm" band={[120, 165]} points={weekly.map((w) => ({ week: w.week, value: w.wpm }))} />
      <Sparkline title="Filler words per answer" points={weekly.map((w) => ({ week: w.week, value: w.fillers }))} />
      <Sparkline title="Looking toward the camera" unit="%" domain={[0, 100]} points={weekly.map((w) => ({ week: w.week, value: w.eye_contact }))} />
    </div>
  );
}

export function Insights({ insights }: { insights: Activity["insights"] }) {
  const style = {
    positive: { icon: TrendingUp, cls: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" },
    tip: { icon: Lightbulb, cls: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" },
    neutral: { icon: Info, cls: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200" },
  } as const;
  return (
    <ul className="animate-stagger space-y-2">
      {insights.map((i) => {
        const { icon: Icon, cls } = style[i.tone] ?? style.neutral;
        return (
          <li key={i.text} className={`flex gap-2.5 rounded-xl border p-3 text-sm ${cls}`}>
            <Icon size={17} className="mt-0.5 shrink-0" aria-hidden="true" /> {i.text}
          </li>
        );
      })}
    </ul>
  );
}

export { Card as ChartCard };
