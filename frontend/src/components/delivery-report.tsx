"use client";

import Link from "next/link";
import { Eye, Move, MessageSquareWarning, ScanFace, Gauge, Lock, Sparkles, ListChecks } from "lucide-react";
import type { VisualMetrics } from "@/components/camera-coach";

export type SpeechMetrics = { words_per_minute: number | null; filler_word_count: number | null };

function paceNote(wpm: number) {
  if (wpm < 110) return { text: "On the slow side — try a little more energy.", tone: "text-amber-600" };
  if (wpm > 170) return { text: "Quite fast — slow down on key points.", tone: "text-amber-600" };
  return { text: "A comfortable, easy-to-follow pace.", tone: "text-emerald-600" };
}

function Row({ icon: Icon, label, value, note, tone = "text-slate-500" }: {
  icon: typeof Eye; label: string; value: string; note?: string; tone?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm text-slate-700 dark:text-slate-300">{label}</p>
          <p className="font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
        {note && <p className={`text-xs ${tone}`}>{note}</p>}
      </div>
    </div>
  );
}

function LockedRow({ icon: Icon, label, desc }: { icon: typeof Eye; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          {label} <Lock size={12} className="text-slate-400" />
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

/**
 * How the answer was delivered (as opposed to what was said, which the
 * written feedback covers). Free shows a summary; paid plans show the
 * full breakdown. Locked rows describe what's available rather than
 * showing blurred values — no fake numbers.
 *
 * All of these metrics are computed on the device or deterministically,
 * with no AI cost; the split is a product tier, not a cost control.
 */
export function DeliveryReport({
  visual, speech, plan,
}: { visual: VisualMetrics | null; speech: SpeechMetrics | null; plan: string }) {
  if (!visual && !speech) return null;
  const paid = plan === "premium" || plan === "pro";
  const wpm = speech?.words_per_minute ?? null;

  return (
    <section className="animate-fade-in mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <ListChecks size={16} className="text-indigo-600" /> How you delivered it
      </h3>

      <div className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
        {visual && (
          <Row icon={ScanFace} label="Face in frame" value={`${visual.face_visible_pct}%`}
            note={visual.face_visible_pct >= 85 ? "Well framed throughout." : "You moved out of frame at times."}
            tone={visual.face_visible_pct >= 85 ? "text-emerald-600" : "text-amber-600"} />
        )}
        {wpm != null && (
          <Row icon={Gauge} label="Speaking pace" value={`${Math.round(wpm)} wpm`} note={paceNote(wpm).text} tone={paceNote(wpm).tone} />
        )}

        {paid ? (
          <>
            {visual && (
              <Row icon={Eye} label="Looking toward the camera" value={`${visual.eye_contact_pct}%`}
                note={visual.eye_contact_pct >= 60 ? "Good, steady eye line." : "Your gaze moved away quite often."}
                tone={visual.eye_contact_pct >= 60 ? "text-emerald-600" : "text-amber-600"} />
            )}
            {visual && (
              <Row icon={Move} label="Head movement" value={`${visual.head_movement_score}/100`}
                note={visual.head_movement_score <= 70 ? "Calm and composed." : "Quite a lot of movement — try staying a little stiller."}
                tone={visual.head_movement_score <= 70 ? "text-emerald-600" : "text-amber-600"} />
            )}
            {speech?.filler_word_count != null && (
              <Row icon={MessageSquareWarning} label="Filler words" value={String(speech.filler_word_count)}
                note={speech.filler_word_count <= 3 ? "Very few — nicely done." : "Try pausing silently instead of \"um\" or \"like\"."}
                tone={speech.filler_word_count <= 3 ? "text-emerald-600" : "text-amber-600"} />
            )}
            {!!visual?.posture_notes.length && (
              <div className="py-2.5">
                <p className="mb-1 text-sm text-slate-700 dark:text-slate-300">Observations</p>
                <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-600 dark:text-slate-400">
                  {visual.posture_notes.map((n) => <li key={n}>{n}</li>)}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            {visual && <LockedRow icon={Eye} label="Eye contact" desc="How much of the time you were looking toward the camera." />}
            {visual && <LockedRow icon={Move} label="Head movement" desc="Whether you stayed composed or moved a lot while speaking." />}
            {speech && <LockedRow icon={MessageSquareWarning} label="Filler words" desc="How often you said \u201cum\u201d, \u201cuh\u201d or \u201clike\u201d." />}
            {visual && <LockedRow icon={ListChecks} label="Observations" desc="Specific notes on framing, gaze and movement." />}
          </>
        )}
      </div>

      {!paid && (
        <div className="mt-3 rounded-lg bg-gradient-to-r from-indigo-50 to-violet-50 p-3 dark:from-indigo-950/40 dark:to-violet-950/40">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-indigo-900 dark:text-indigo-200">
            <Sparkles size={15} /> Full delivery analysis on Premium and Pro
          </p>
          <p className="mt-0.5 text-xs text-indigo-900/80 dark:text-indigo-200/80">
            See eye contact, head movement, filler words and specific observations for every answer —
            plus longer sessions with more retries.
          </p>
          <Link href="/dashboard/settings" className="mt-2 inline-block text-xs font-semibold text-indigo-700 underline dark:text-indigo-300">
            Compare plans
          </Link>
        </div>
      )}
    </section>
  );
}
