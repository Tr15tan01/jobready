"use client";

import { useAuth } from "@/lib/auth-context";
import { useCallback, useEffect, useState, useRef } from "react";
import { VoiceRecorder, type RecorderPhase } from "@/components/voice-recorder";
import { CameraCoach, type VisualMetrics } from "@/components/camera-coach";
import { DeliveryReport, type SpeechMetrics } from "@/components/delivery-report";
import { AnswerModeSelector, type AnswerMode } from "@/components/ui/answer-mode-selector";
import { ModeCards, TONES, type ModeOption } from "@/components/ui/mode-cards";
import { Users, Brain, Handshake, MessageCircle, Target } from "lucide-react";
import Link from "next/link";
import { LoadingButton, LoadingPanel } from "@/components/ui/spinner";
import { API_URL } from "@/lib/api-client";


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

export function InterviewPractice() {
  const { accessToken: token } = useAuth();

  const [mode, setMode] = useState<string>("behavioral");
  // #12: what role the questions target — a saved job, or (if none chosen)
  // the user's own headline from the dashboard.
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState<string>("");
  const [headline, setHeadline] = useState<string | null>(null);
  const [answerMode, setAnswerMode] = useState<AnswerMode>("text");
  const [recorderPhase, setRecorderPhase] = useState<RecorderPhase>("idle");
  // Camera metrics are computed the instant recording stops, but can only
  // be saved once transcription has created the answer. Held here until then.
  const pendingMetrics = useRef<VisualMetrics | null>(null);
  // Kept for the results view (camera metrics used to be submitted, then discarded).
  const [lastVisual, setLastVisual] = useState<VisualMetrics | null>(null);
  const [lastSpeech, setLastSpeech] = useState<SpeechMetrics | null>(null);
  const [plan, setPlan] = useState("free");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answerId, setAnswerId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function failWith(res: Response) {
    const body = await res.json().catch(() => ({}));
    setNotice(typeof body.detail === "string" ? body.detail : "Something went wrong. Please try again.");
  }
  const [completed, setCompleted] = useState<{ overall_score: number | null } | null>(null);

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

  async function startSession() {
    setLoading(true);
    setCompleted(null);
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
    setLoading(false);
    if (!res.ok) { await failWith(res); return; }
    setNotice(null);
    const data = await res.json();
    setSessionId(data.id);
    setQuestion(data.questions[0]);
    setAnswerId(null);
    setRecorderPhase("idle");
    pendingMetrics.current = null;
    setLastVisual(null);
    setLastSpeech(null);
    setEvaluation(null);
    setAnswerText("");
  }

  async function submitAnswer() {
    if (!sessionId || !question || !answerText.trim()) return;
    setLoading(true);
    const res = await fetch(`${API_URL}/api/v1/interviews/${sessionId}/answers`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ question_id: question.id, transcript: answerText, input_mode: "text" }),
    });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const { id } = await res.json();
    setAnswerId(id);
    await evaluateAnswer(id);
  }

  async function submitMetrics(answerId: string) {
    const metrics = pendingMetrics.current;
    pendingMetrics.current = null;
    setLastVisual(metrics);
    if (!metrics || !sessionId) return;
    // Aggregate numbers only — no frame or video ever leaves the browser.
    await fetch(`${API_URL}/api/v1/interviews/${sessionId}/answers/${answerId}/visual-metrics`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(metrics),
    }).catch(() => {});
  }

  async function evaluateAnswer(id: string) {
    if (!sessionId) return;
    setLoading(true);
    const evalRes = await fetch(`${API_URL}/api/v1/interviews/${sessionId}/evaluate`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ answer_id: id }),
    });
    setLoading(false);
    if (evalRes.ok) setEvaluation(await evalRes.json());
    else await failWith(evalRes);
  }

  async function retry() {
    setAnswerText("");
    setAnswerId(null);
    setRecorderPhase("idle");
    pendingMetrics.current = null;
    setLastVisual(null);
    setLastSpeech(null);
    setEvaluation(null);
  }

  async function nextQuestion() {
    if (!sessionId) return;
    setLoading(true);
    const res = await fetch(`${API_URL}/api/v1/interviews/${sessionId}/next-question`, {
      method: "POST",
      headers: authHeaders(),
    });
    setLoading(false);
    if (!res.ok) { await failWith(res); return; }
    setNotice(null);
    setQuestion(await res.json());
    setAnswerText("");
    setAnswerId(null);
    setRecorderPhase("idle");
    pendingMetrics.current = null;
    setLastVisual(null);
    setLastSpeech(null);
    setEvaluation(null);
  }

  async function finish() {
    if (!sessionId) return;
    setLoading(true);
    const res = await fetch(`${API_URL}/api/v1/interviews/${sessionId}/complete`, {
      method: "POST",
      headers: authHeaders(),
    });
    setLoading(false);
    if (res.ok) setCompleted(await res.json());
  }

  // Server messages (monthly limit, per-session cap, etc.) must be shown —
  // these used to be silently dropped, so buttons appeared to do nothing.
  const noticeBanner = notice && (
    <div role="alert" className="animate-fade-in mb-4 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <span>
        {notice}{" "}
        {/limit|upgrade/i.test(notice) && (
          <a href="/dashboard/settings" className="font-semibold underline">See plans</a>
        )}
      </span>
      <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 font-bold">×</button>
    </div>
  );

  if (!sessionId) {
    return (
      <>
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
            disabled={loading}
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
              ? "Questions will fit your role. Pick a saved job for questions matched to a specific posting."
              : <>Tip: <Link href="/dashboard" className="font-medium text-indigo-600 underline dark:text-indigo-400">set your job title</Link> or <Link href="/dashboard/jobs" className="font-medium text-indigo-600 underline dark:text-indigo-400">add a job</Link> for more relevant questions.</>}
          </p>
        </div>
        <div className="mb-5">
          <ModeCards label="Choose an interview style" options={MODES} value={mode} onChange={setMode} disabled={loading} />
        </div>
        <div className="mb-5">
          <AnswerModeSelector value={answerMode} onChange={setAnswerMode} disabled={loading} />
        </div>
        <LoadingButton
          onClick={startSession}
          loading={loading}
          loadingText="Preparing your first question..."
          className="w-full sm:w-auto"
        >
          Start interview
        </LoadingButton>
      </div>
      </>
    );
  }

  if (completed) {
    return (
      <div className="rounded-xl border border-slate-100 p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">Session complete</p>
        <p className="my-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">
          {completed.overall_score != null ? `${completed.overall_score}/10` : "No score yet"}
        </p>
        <button
          onClick={() => setSessionId(null)}
          className="mt-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Start another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {noticeBanner}
      <div className="rounded-xl border border-slate-100 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {question?.category ?? mode}
        </p>
        <p className="text-base sm:text-lg text-slate-900 dark:text-slate-50">{question?.prompt}</p>
      </div>

      {loading && !evaluation && answerId ? (
        <LoadingPanel label="Analysing your answer..." />
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
              sessionId={sessionId}
              questionId={question.id}
              token={token}
              onPhaseChange={setRecorderPhase}
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
              <LoadingButton
                onClick={submitAnswer}
                loading={loading}
                loadingText="Scoring your answer..."
                disabled={!answerText.trim()}
                className="mt-3 w-full sm:w-auto"
              >
                Submit answer
              </LoadingButton>
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
          <DeliveryReport visual={lastVisual} speech={lastSpeech} plan={plan} />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={retry}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              One more try
            </button>
            <LoadingButton onClick={nextQuestion} loading={loading} loadingText="Thinking...">
              Next question
            </LoadingButton>
            <LoadingButton onClick={finish} loading={loading} variant="secondary">
              Finish session
            </LoadingButton>
          </div>
        </div>
      )}
    </div>
  );
}
