"use client";

import { useAuth } from "@/lib/auth-context";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { VoiceRecorder, type RecorderPhase } from "@/components/voice-recorder";
import { CameraCoach, type VisualMetrics } from "@/components/camera-coach";
import { DeliveryReport, type SpeechMetrics } from "@/components/delivery-report";
import { AnswerModeSelector, type AnswerMode } from "@/components/ui/answer-mode-selector";
import { ModeCards, TONES, type ModeOption } from "@/components/ui/mode-cards";
import { SessionHeader, SessionSummary } from "@/components/practice-session-ui";
import { Megaphone, Zap, BookOpen, Presentation, Scale, Rocket, Mic, Shuffle, Lock, BookMarked, Sparkles, X } from "lucide-react";
import { LoadingButton, LoadingPanel, Spinner } from "@/components/ui/spinner";
import { API_URL } from "@/lib/api-client";
import { tipsHref } from "@/lib/tips-slugs";

type TopicCounts = { free: number; premium: number; pro: number };
type Mode = { value: string; label: string; topics?: TopicCounts };

// Labels come from the API; icon, colour and one-line description are
// presentation, so they live here.
const MODE_STYLE: Record<string, Omit<ModeOption, "value" | "label">> = {
  persuasive: { description: "Win someone over", icon: Megaphone, tone: TONES.rose },
  impromptu: { description: "Think on your feet", icon: Zap, tone: TONES.amber },
  storytelling: { description: "Make it memorable", icon: BookOpen, tone: TONES.violet },
  presentation: { description: "Explain with clarity", icon: Presentation, tone: TONES.sky },
  debate: { description: "Argue a side", icon: Scale, tone: TONES.indigo },
  pitch: { description: "60 seconds to impress", icon: Rocket, tone: TONES.emerald },
};
const PLAN_NAMES: Record<string, string> = { free: "Free", premium: "Premium", pro: "Pro" };

type Evaluation = {
  score: number;
  strengths: string[];
  improvements: string[];
  missing_points: string[];
  suggested_answer: string | null;
};

const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

/** Topics per plan for one speech type, with the user's plan highlighted. */
function TopicTiers({ counts, plan }: { counts: TopicCounts; plan: string }) {
  const tiers = (["free", "premium", "pro"] as const).map((p) => ({ key: p, n: counts[p] }));
  const paid = plan === "premium" || plan === "pro";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Topics for this speech type</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {tiers.map(({ key, n }) => {
          const mine = key === plan;
          const locked = !mine && (plan === "free" ? key !== "free" : plan === "premium" ? key === "pro" : false);
          return (
            <div
              key={key}
              className={`rounded-lg px-2 py-2 text-center ${
                mine
                  ? "bg-indigo-600 text-white shadow-sm"
                  : locked
                  ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900"
                  : "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <p className="text-lg font-bold leading-none">{n}</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-[11px] font-medium">
                {locked && <Lock size={10} aria-hidden="true" />}
                {PLAN_NAMES[key]}{mine ? " · you" : ""}
              </p>
            </div>
          );
        })}
      </div>
      {!paid ? (
        <Link
          href="/dashboard/settings#plans"
          className="mt-2.5 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 text-xs font-semibold text-white shadow-sm hover:from-amber-600 hover:to-orange-600"
        >
          <Sparkles size={13} aria-hidden="true" /> Unlock {counts.premium - counts.free}+ more topics
        </Link>
      ) : plan === "premium" && counts.pro > counts.premium ? (
        <Link href="/dashboard/settings#plans" className="mt-2 inline-block text-xs font-semibold text-indigo-600 underline dark:text-indigo-400">
          Pro unlocks all {counts.pro}
        </Link>
      ) : null}
    </div>
  );
}

export function SpeechPractice() {
  const { accessToken: token } = useAuth();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [modes, setModes] = useState<Mode[]>([]);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [answerMode, setAnswerMode] = useState<AnswerMode>("voice");
  const [recorderPhase, setRecorderPhase] = useState<RecorderPhase>("idle");
  // Camera metrics are computed the instant recording stops, but can only
  // be saved once transcription has created the answer. Held here until then.
  const pendingMetrics = useRef<VisualMetrics | null>(null);
  const [lastVisual, setLastVisual] = useState<VisualMetrics | null>(null);
  const [lastSpeech, setLastSpeech] = useState<SpeechMetrics | null>(null);
  const [plan, setPlan] = useState("free");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [pool, setPool] = useState<{ available: number; total: number } | null>(null);
  const [answerId, setAnswerId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [starting, setStarting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [finished, setFinished] = useState<{ overall_score: number | null } | null>(null);
  // One controller for whatever request is in flight, so Cancel can stop it.
  const abortRef = useRef<AbortController | null>(null);

  async function failWith(res: Response) {
    const body = await res.json().catch(() => ({}));
    setNotice(typeof body.detail === "string" ? body.detail : "Something went wrong. Please try again.");
  }

  const authHeaders = useCallback(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    }),
    [token]
  );

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/v1/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null)).then((d) => setPlan(d?.plan ?? "free")).catch(() => {});
  }, [token]);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/speech-practice/modes`)
      .then((r) => r.json())
      .then(setModes)
      .catch(() => setModes([]));
  }, []);

  // Bring the practice area into view when the stage changes, so the next
  // buttons are always on screen (they used to appear below the fold).
  const stage = finished ? "finished" : sessionId ? "active" : "picker";
  useEffect(() => {
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stage]);

  // Stop any in-flight request if the page is left.
  useEffect(() => () => abortRef.current?.abort(), []);

  function newController() {
    abortRef.current?.abort();
    const c = new AbortController();
    abortRef.current = c;
    return c;
  }

  function resetAnswer() {
    setAnswerId(null);
    setRecorderPhase("idle");
    pendingMetrics.current = null;
    setLastVisual(null);
    setLastSpeech(null);
    setEvaluation(null);
  }

  function resetSession() {
    abortRef.current?.abort();
    abortRef.current = null;
    setSessionId(null);
    setQuestionId(null);
    setPrompt(null);
    setPool(null);
    setAnswerText("");
    setScores([]);
    setFinished(null);
    setScoring(false);
    setFinishing(false);
    resetAnswer();
  }

  async function startPractice(mode = selectedMode) {
    if (!mode) return;
    setStarting(true);
    setNotice(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/speech-practice/start`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          mode,
          // A video answer is still transcribed from audio; the camera
          // layers on-device visual analysis on top.
          input_mode: answerMode === "video" ? "voice" : answerMode,
          camera_enabled: answerMode === "video",
        }),
      });
      if (!res.ok) { await failWith(res); return; }
      const data = await res.json();
      resetSession();
      setSessionId(data.session_id);
      setQuestionId(data.question_id);
      setPrompt(data.prompt);
      if (data.topics_available) setPool({ available: data.topics_available, total: data.topics_total });
    } catch {
      setNotice("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }

  async function shuffleTopic() {
    if (!sessionId) return;
    setShuffling(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/speech-practice/${sessionId}/shuffle`, {
        method: "POST", headers: authHeaders(),
      });
      if (!res.ok) { await failWith(res); return; }
      const data = await res.json();
      setPrompt(data.prompt);
      setNotice(null);
    } catch {
      setNotice("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setShuffling(false);
    }
  }

  async function submitMetrics(id: string) {
    const metrics = pendingMetrics.current;
    pendingMetrics.current = null;
    setLastVisual(metrics);
    if (!metrics || !sessionId) return;
    // Aggregate numbers only — no frame or video ever leaves the browser.
    await fetch(`${API_URL}/api/v1/interviews/${sessionId}/answers/${id}/visual-metrics`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(metrics),
    }).catch(() => {});
  }

  async function evaluateAnswer(id: string, controller = newController()) {
    if (!sessionId) return;
    setScoring(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/interviews/${sessionId}/evaluate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ answer_id: id }),
        signal: controller.signal,
      });
      if (res.ok) {
        const ev: Evaluation = await res.json();
        setEvaluation(ev);
        setScores((s) => [...s, ev.score]);
      } else {
        await failWith(res);
        resetAnswer();
      }
    } catch (e) {
      if (!isAbort(e)) {
        setNotice("Couldn't reach the server. Check your connection and try again.");
        resetAnswer();
      }
    } finally {
      if (abortRef.current === controller) setScoring(false);
    }
  }

  async function submitTextAnswer() {
    if (!sessionId || !questionId || !answerText.trim()) return;
    const controller = newController();
    setScoring(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/interviews/${sessionId}/answers`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ question_id: questionId, transcript: answerText, input_mode: "text" }),
        signal: controller.signal,
      });
      if (!res.ok) { await failWith(res); setScoring(false); return; }
      const { id } = await res.json();
      setAnswerId(id);
      await evaluateAnswer(id, controller);
    } catch (e) {
      if (!isAbort(e)) setNotice("Couldn't reach the server. Check your connection and try again.");
      setScoring(false);
    }
  }

  /** Cancel while an answer is being scored: back to answering. */
  function cancelScoring() {
    abortRef.current?.abort();
    abortRef.current = null;
    setScoring(false);
    resetAnswer();
  }

  /** Leave the session from any stage. Scored answers are still saved. */
  function leaveSession() {
    if (sessionId && scores.length > 0) {
      // Fire-and-forget: record what was scored so progress isn't lost.
      fetch(`${API_URL}/api/v1/interviews/${sessionId}/complete`, {
        method: "POST", headers: authHeaders(), keepalive: true,
      }).catch(() => {});
    }
    resetSession();
  }

  async function finish() {
    if (!sessionId) return;
    setFinishing(true);
    const localAvg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
    try {
      const res = await fetch(`${API_URL}/api/v1/interviews/${sessionId}/complete`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.ok) {
        setFinished(await res.json());
      } else {
        // Never strand the user on a dead button: show the result anyway.
        await failWith(res);
        setFinished({ overall_score: localAvg });
      }
    } catch {
      setNotice("Couldn't save the session summary, but your scored answers are kept.");
      setFinished({ overall_score: localAvg });
    } finally {
      setFinishing(false);
    }
  }

  const modeLabel = modes.find((m) => m.value === selectedMode)?.label ?? "Speech practice";
  const modeIcon = (selectedMode && MODE_STYLE[selectedMode]?.icon) || Mic;
  const selectedCounts = modes.find((m) => m.value === selectedMode)?.topics;

  // Server messages (monthly limit, per-session cap, etc.) must be shown —
  // these used to be silently dropped, so buttons appeared to do nothing.
  const noticeBanner = notice && (
    <div role="alert" className="animate-fade-in flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <span>
        {notice}{" "}
        {/limit|upgrade/i.test(notice) && (
          <a href="/dashboard/settings#plans" className="font-semibold underline">See plans</a>
        )}
      </span>
      <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 font-bold">×</button>
    </div>
  );

  // ---- Mode picker ----
  if (!sessionId) {
    return (
      <div ref={rootRef} className="scroll-mt-24 space-y-4">
        {noticeBanner}
        <ModeCards
          label="Choose a speech type"
          value={selectedMode}
          onChange={setSelectedMode}
          disabled={starting}
          options={modes.map((m) => ({
            value: m.value,
            label: m.label,
            ...(MODE_STYLE[m.value] ?? { description: "", icon: Mic, tone: TONES.indigo }),
          }))}
        />

        {selectedMode && (
          <div className="animate-fade-in grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
            {selectedCounts ? <TopicTiers counts={selectedCounts} plan={plan} /> : <div />}
            <Link
              href={tipsHref(selectedMode)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-semibold text-orange-800 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200 dark:hover:bg-orange-900/40"
            >
              <BookMarked size={16} aria-hidden="true" /> {modeLabel} guide
            </Link>
          </div>
        )}

        <AnswerModeSelector value={answerMode} onChange={setAnswerMode} disabled={starting} />

        <LoadingButton
          onClick={() => startPractice()}
          loading={starting}
          loadingText="Picking your topic..."
          disabled={!selectedMode}
          className="w-full sm:w-auto"
        >
          <Shuffle size={16} aria-hidden="true" /> Get a random topic
        </LoadingButton>
      </div>
    );
  }

  // ---- Finished ----
  if (finished) {
    const best = scores.length ? Math.max(...scores) : null;
    return (
      <div ref={rootRef} className="scroll-mt-24 space-y-4">
        {noticeBanner}
        <SessionSummary
          score={finished.overall_score}
          stats={[
            { label: "Speech type", value: modeLabel.replace(" Speech", "") },
            { label: "Attempts scored", value: String(scores.length) },
            { label: "Best attempt", value: best != null ? `${best}/10` : "—" },
          ]}
          backLabel="Back to speech types"
          onBack={resetSession}
          againLabel={`New ${modeLabel.replace(" Speech", "").toLowerCase()} topic`}
          onAgain={() => startPractice(selectedMode)}
          links={[
            { href: tipsHref(selectedMode), label: "Read the guide" },
            { href: "/dashboard/progress", label: "View progress" },
          ]}
        />
        {starting && <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Picking your topic...</p>}
      </div>
    );
  }

  // ---- Prompt + speak/type + evaluation ----
  const canShuffle = !answerId && !scoring && recorderPhase === "idle" && scores.length === 0;
  return (
    <div ref={rootRef} className="scroll-mt-24 space-y-4">
      <SessionHeader
        icon={modeIcon}
        label={modeLabel}
        detail={
          scores.length
            ? `${scores.length} attempt${scores.length > 1 ? "s" : ""} scored · ${answerMode === "video" ? "Video" : answerMode === "voice" ? "Audio" : "Written"}`
            : answerMode === "video" ? "Video answer" : answerMode === "voice" ? "Audio answer" : "Written answer"
        }
        onCancel={leaveSession}
        hasScoredAnswers={scores.length > 0}
      />
      {noticeBanner}

      <div className="rounded-xl border border-slate-100 p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Your topic</p>
          {canShuffle && (
            <button
              type="button"
              onClick={shuffleTopic}
              disabled={shuffling}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {shuffling ? <Spinner size={13} /> : <Shuffle size={13} aria-hidden="true" />} Different topic
            </button>
          )}
        </div>
        <p className="text-base sm:text-lg text-slate-900 dark:text-slate-50">{prompt}</p>
        {pool && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Drawn at random from {pool.available} {PLAN_NAMES[plan] ?? ""} topics — no repeats until you&apos;ve seen them all.
            {pool.available < pool.total && (
              <>
                {" "}
                <Link href="/dashboard/settings#plans" className="inline-flex items-center gap-1 font-semibold text-amber-700 underline dark:text-amber-400">
                  <Lock size={11} aria-hidden="true" /> {pool.total - pool.available} more on paid plans
                </Link>
              </>
            )}
          </p>
        )}
      </div>

      {scoring ? (
        <LoadingPanel label="Scoring your response..." onCancel={cancelScoring} cancelLabel="Cancel and answer again" />
      ) : !evaluation ? (
        <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800 dark:bg-slate-900">
          {answerMode === "video" && sessionId && (
            <div className="mb-4">
              <CameraCoach
                active={recorderPhase !== "transcribing" && !answerId}
                onMetrics={(m) => { pendingMetrics.current = m; }}
              />
            </div>
          )}
          {answerMode !== "text" ? (
            <VoiceRecorder
              sessionId={sessionId}
              questionId={questionId!}
              token={token}
              onPhaseChange={setRecorderPhase}
              onCancel={leaveSession}
              cancelLabel="Cancel and leave"
              onResult={async (result) => {
                setLastSpeech({ words_per_minute: result.words_per_minute, filler_word_count: result.filler_word_count });
                setAnswerId(result.answer_id);
                await submitMetrics(result.answer_id);
                evaluateAnswer(result.answer_id);
              }}
            />
          ) : (
            <>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                rows={5}
                placeholder="Type your response..."
                className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <LoadingButton onClick={submitTextAnswer} disabled={!answerText.trim()} className="w-full sm:w-auto">
                  Submit
                </LoadingButton>
                <button
                  type="button"
                  onClick={leaveSession}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <X size={15} aria-hidden="true" /> Cancel and leave
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="animate-fade-in rounded-xl border border-slate-100 p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-50">
            {evaluation.score}/10
          </p>
          {evaluation.strengths.length > 0 && (
            <div className="mb-2">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Strong</p>
              <ul className="list-inside list-disc text-sm text-slate-600 dark:text-slate-300">
                {evaluation.strengths.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          )}
          {evaluation.improvements.length > 0 && (
            <div className="mb-2">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Improve</p>
              <ul className="list-inside list-disc text-sm text-slate-600 dark:text-slate-300">
                {evaluation.improvements.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          )}
          {evaluation.suggested_answer && (
            <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <p className="mb-1 font-medium">Try a stronger version:</p>
              {evaluation.suggested_answer}
            </div>
          )}
          <DeliveryReport visual={lastVisual} speech={lastSpeech} plan={plan} />

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => { resetAnswer(); setAnswerText(""); }}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              One more try
            </button>
            <LoadingButton onClick={finish} loading={finishing} loadingText="Saving your results..." variant="success">
              Finish
            </LoadingButton>
          </div>
        </div>
      )}
    </div>
  );
}
