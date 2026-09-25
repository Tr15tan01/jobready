"use client";

import { useAuth } from "@/lib/auth-context";
import { useCallback, useEffect, useState, useRef } from "react";
import { VoiceRecorder, type RecorderPhase } from "@/components/voice-recorder";
import { CameraCoach, type VisualMetrics } from "@/components/camera-coach";
import { DeliveryReport, type SpeechMetrics } from "@/components/delivery-report";
import { AnswerModeSelector, type AnswerMode } from "@/components/ui/answer-mode-selector";
import { ModeCards, TONES, type ModeOption } from "@/components/ui/mode-cards";
import { SessionHeader, SessionSummary } from "@/components/practice-session-ui";
import { Users, Brain, Handshake, MessageCircle, Target, X, BookMarked } from "lucide-react";
import Link from "next/link";
import { LoadingButton, LoadingPanel, Spinner } from "@/components/ui/spinner";
import { API_URL } from "@/lib/api-client";
import { INTERVIEW_TIPS_SLUG } from "@/lib/tips-slugs";


const MODES: ModeOption[] = [
  { value: "behavioral", label: "Behavioral", description: "Past situations, told with STAR", icon: Users, tone: TONES.indigo },
  { value: "domain", label: "Domain deep-dive", description: "Depth in your field", icon: Brain, tone: TONES.violet },
  { value: "hr", label: "HR", description: "Motivation, fit, logistics", icon: Handshake, tone: TONES.emerald },
  { value: "general", label: "General", description: "A friendly all-rounder", icon: MessageCircle, tone: TONES.amber },
];

type Job = { id: string; title: string; company: string | null };

type Question = { id: string; prompt: string; category: string | null };
type Evaluation = {
  score: number;
  strengths: string[];
  improvements: string[];
  missing_points: string[];
  suggested_answer: string | null;
  practice_focus: string | null;
};


const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

export function InterviewPractice() {
  const { accessToken: token } = useAuth();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<string>("behavioral");
  // What role the questions target — a saved job, or (if none chosen) the
  // user's own headline from the dashboard.
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState<string>("");
  const [headline, setHeadline] = useState<string | null>(null);
  const [answerMode, setAnswerMode] = useState<AnswerMode>("text");
  const [recorderPhase, setRecorderPhase] = useState<RecorderPhase>("idle");
  // Camera metrics are computed the instant recording stops, but can only
  // be saved once transcription has created the answer. Held here until then.
  const pendingMetrics = useRef<VisualMetrics | null>(null);
  const [lastVisual, setLastVisual] = useState<VisualMetrics | null>(null);
  const [lastSpeech, setLastSpeech] = useState<SpeechMetrics | null>(null);
  const [plan, setPlan] = useState("free");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [answerId, setAnswerId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [starting, setStarting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [nexting, setNexting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [completed, setCompleted] = useState<{ overall_score: number | null } | null>(null);
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
    const h = { Authorization: `Bearer ${token}` };
    fetch(`${API_URL}/api/v1/jobs`, { headers: h }).then((r) => (r.ok ? r.json() : [])).then(setJobs).catch(() => {});
    fetch(`${API_URL}/api/v1/me`, { headers: h }).then((r) => (r.ok ? r.json() : null))
      .then((d) => { setHeadline(d?.headline ?? null); setPlan(d?.plan ?? "free"); }).catch(() => {});
  }, [token]);

  // Keep the practice area in view when the stage changes, so the next
  // buttons are always on screen.
  const stage = completed ? "finished" : sessionId ? "active" : "picker";
  useEffect(() => {
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stage]);

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
    setQuestion(null);
    setQuestionCount(0);
    setAnswerText("");
    setScores([]);
    setCompleted(null);
    setScoring(false);
    setNexting(false);
    setFinishing(false);
    resetAnswer();
  }

  async function startSession() {
    setStarting(true);
    setNotice(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/interviews`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          mode,
          job_id: jobId || null,
          difficulty: "medium",
          // Video answers are still transcribed from audio; the camera adds
          // on-device visual analysis on top.
          input_mode: answerMode === "video" ? "voice" : answerMode,
          camera_enabled: answerMode === "video",
        }),
      });
      if (!res.ok) { await failWith(res); return; }
      const data = await res.json();
      resetSession();
      setSessionId(data.id);
      setQuestion(data.questions[0]);
      setQuestionCount(1);
    } catch {
      setNotice("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setStarting(false);
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

  async function submitAnswer() {
    if (!sessionId || !question || !answerText.trim()) return;
    const controller = newController();
    setScoring(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/interviews/${sessionId}/answers`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ question_id: question.id, transcript: answerText, input_mode: "text" }),
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

  function cancelScoring() {
    abortRef.current?.abort();
    abortRef.current = null;
    setScoring(false);
    resetAnswer();
  }

  function retry() {
    setAnswerText("");
    resetAnswer();
  }

  async function nextQuestion() {
    if (!sessionId) return;
    const controller = newController();
    setNexting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/interviews/${sessionId}/next-question`, {
        method: "POST",
        headers: authHeaders(),
        signal: controller.signal,
      });
      if (!res.ok) { await failWith(res); return; }
      setNotice(null);
      setQuestion(await res.json());
      setQuestionCount((n) => n + 1);
      setAnswerText("");
      resetAnswer();
    } catch (e) {
      if (!isAbort(e)) setNotice("Couldn't reach the server. Check your connection and try again.");
    } finally {
      if (abortRef.current === controller) setNexting(false);
    }
  }

  function cancelNext() {
    abortRef.current?.abort();
    abortRef.current = null;
    setNexting(false);
  }

  /** Leave the session from any stage. Scored answers are still saved. */
  function leaveSession() {
    if (sessionId && scores.length > 0) {
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
        setCompleted(await res.json());
      } else {
        // Never strand the user on a dead button: show the result anyway.
        await failWith(res);
        setCompleted({ overall_score: localAvg });
      }
    } catch {
      setNotice("Couldn't save the session summary, but your scored answers are kept.");
      setCompleted({ overall_score: localAvg });
    } finally {
      setFinishing(false);
    }
  }

  const modeOption = MODES.find((m) => m.value === mode) ?? MODES[0];
  const job = jobs.find((j) => j.id === jobId);
  const target = job ? `${job.title}${job.company ? ` · ${job.company}` : ""}` : headline ?? "General practice";

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

  if (!sessionId) {
    return (
      <div ref={rootRef} className="scroll-mt-24 space-y-4">
        {noticeBanner}
        <div className="rounded-xl border border-slate-100 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5">
            <label htmlFor="target-role" className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Target size={15} className="text-rose-500" /> What are you practising for?
            </label>
            <select
              id="target-role"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              disabled={starting}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">{headline ? `My role: ${headline}` : "General practice (no specific role)"}</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}{j.company ? ` — ${j.company}` : ""}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {jobId
                ? "Questions will target this job's requirements."
                : headline
                ? <>Questions will fit your role. <Link href="/dashboard/jobs" className="font-medium text-indigo-600 underline dark:text-indigo-400">Pick an example job</Link> for questions matched to a specific posting.</>
                : <>Tip: <Link href="/dashboard" className="font-medium text-indigo-600 underline dark:text-indigo-400">set your job title</Link> or <Link href="/dashboard/jobs" className="font-medium text-indigo-600 underline dark:text-indigo-400">add a job</Link> for more relevant questions.</>}
            </p>
          </div>
          <div className="mb-5">
            <ModeCards label="Choose an interview style" options={MODES} value={mode} onChange={setMode} disabled={starting} />
          </div>
          <div className="mb-5">
            <AnswerModeSelector value={answerMode} onChange={setAnswerMode} disabled={starting} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <LoadingButton
              onClick={startSession}
              loading={starting}
              loadingText="Preparing your first question..."
              className="w-full sm:w-auto"
            >
              Start interview
            </LoadingButton>
            <Link
              href={`/tips/${INTERVIEW_TIPS_SLUG}`}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-4 text-sm font-semibold text-orange-800 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200"
            >
              <BookMarked size={15} aria-hidden="true" /> Interview answer guide
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (completed) {
    const best = scores.length ? Math.max(...scores) : null;
    return (
      <div ref={rootRef} className="scroll-mt-24 space-y-4">
        {noticeBanner}
        <SessionSummary
          score={completed.overall_score}
          stats={[
            { label: "Style", value: modeOption.label },
            { label: "Answers scored", value: String(scores.length) },
            { label: "Best answer", value: best != null ? `${best}/10` : "—" },
          ]}
          backLabel="Back to interview setup"
          onBack={resetSession}
          againLabel="Same setup, new interview"
          onAgain={startSession}
          links={[
            { href: "/dashboard/jobs", label: "Choose a job" },
            { href: "/dashboard/progress", label: "View progress" },
          ]}
        />
        {starting && <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Preparing your first question...</p>}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="scroll-mt-24 space-y-4">
      <SessionHeader
        icon={modeOption.icon}
        label={`${modeOption.label} interview`}
        detail={`Question ${questionCount} · ${target}`}
        onCancel={leaveSession}
        hasScoredAnswers={scores.length > 0}
      />
      {noticeBanner}
      <div className="rounded-xl border border-slate-100 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {question?.category ?? mode}
        </p>
        <p className="text-base sm:text-lg text-slate-900 dark:text-slate-50">{question?.prompt}</p>
      </div>

      {nexting ? (
        <LoadingPanel label="Preparing your next question..." onCancel={cancelNext} cancelLabel="Cancel" />
      ) : scoring ? (
        <LoadingPanel label="Analysing your answer..." onCancel={cancelScoring} cancelLabel="Cancel and answer again" />
      ) : !evaluation ? (
        <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800 dark:bg-slate-900">
          {answerMode === "video" && (
            <div className="mb-4">
              <CameraCoach
                active={recorderPhase !== "transcribing" && !answerId}
                onMetrics={(m) => { pendingMetrics.current = m; }}
              />
            </div>
          )}
          {answerMode !== "text" && question ? (
            <VoiceRecorder
              key={question.id}
              sessionId={sessionId}
              questionId={question.id}
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
                placeholder="Type your answer..."
                className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <LoadingButton onClick={submitAnswer} disabled={!answerText.trim()} className="w-full sm:w-auto">
                  Submit answer
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
        <div className="animate-fade-in rounded-xl border border-slate-100 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-50">{evaluation.score}/10</p>
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
          {evaluation.practice_focus && (
            <p className="mb-3 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
              <span className="font-semibold">Practise next:</span> {evaluation.practice_focus}
            </p>
          )}
          <DeliveryReport visual={lastVisual} speech={lastSpeech} plan={plan} />

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={retry}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              One more try
            </button>
            <LoadingButton onClick={nextQuestion} loading={nexting} loadingText="Thinking...">
              Next question
            </LoadingButton>
            <LoadingButton onClick={finish} loading={finishing} loadingText="Saving your results..." variant="success">
              Finish session
            </LoadingButton>
          </div>
        </div>
      )}
    </div>
  );
}
