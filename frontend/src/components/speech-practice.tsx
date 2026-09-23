"use client";

import { useAuth } from "@/lib/auth-context";
import { useCallback, useEffect, useState, useRef } from "react";
import { VoiceRecorder, type RecorderPhase } from "@/components/voice-recorder";
import { CameraCoach, type VisualMetrics } from "@/components/camera-coach";
import { DeliveryReport, type SpeechMetrics } from "@/components/delivery-report";
import { AnswerModeSelector, type AnswerMode } from "@/components/ui/answer-mode-selector";
import { ModeCards, TONES, type ModeOption } from "@/components/ui/mode-cards";
import { Megaphone, Zap, BookOpen, Presentation, Scale, Rocket, Mic } from "lucide-react";
import { LoadingButton, LoadingPanel } from "@/components/ui/spinner";
import { API_URL } from "@/lib/api-client";


type Mode = { value: string; label: string };

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
type Evaluation = {
  score: number;
  strengths: string[];
  improvements: string[];
  missing_points: string[];
  suggested_answer: string | null;
};

export function SpeechPractice() {
  const { accessToken: token } = useAuth();

  const [modes, setModes] = useState<Mode[]>([]);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [answerMode, setAnswerMode] = useState<AnswerMode>("voice");
  const [recorderPhase, setRecorderPhase] = useState<RecorderPhase>("idle");
  // Camera metrics are computed the instant recording stops, but can only
  // be saved once transcription has created the answer. Held here until then.
  const pendingMetrics = useRef<VisualMetrics | null>(null);
  // Kept for the results view (camera metrics used to be submitted, then discarded).
  const [lastVisual, setLastVisual] = useState<VisualMetrics | null>(null);
  const [lastSpeech, setLastSpeech] = useState<SpeechMetrics | null>(null);
  const [plan, setPlan] = useState("free");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [answerId, setAnswerId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function failWith(res: Response) {
    const body = await res.json().catch(() => ({}));
    setNotice(typeof body.detail === "string" ? body.detail : "Something went wrong. Please try again.");
  }
  const [finished, setFinished] = useState<{ overall_score: number | null } | null>(null);

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

  async function startPractice() {
    if (!selectedMode) return;
    setLoading(true);
    setFinished(null);
    const res = await fetch(`${API_URL}/api/v1/speech-practice/start`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        mode: selectedMode,
        // A video answer is still transcribed from audio; the camera
        // layers on-device visual analysis on top.
        input_mode: answerMode === "video" ? "voice" : answerMode,
        camera_enabled: answerMode === "video",
      }),
    });
    setLoading(false);
    if (!res.ok) { await failWith(res); return; }
    setNotice(null);
    const data = await res.json();
    setSessionId(data.session_id);
    setQuestionId(data.question_id);
    setPrompt(data.prompt);
    setAnswerId(null);
    setRecorderPhase("idle");
    pendingMetrics.current = null;
    setLastVisual(null);
    setLastSpeech(null);
    setAnswerText("");
    setEvaluation(null);
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
    const res = await fetch(`${API_URL}/api/v1/interviews/${sessionId}/evaluate`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ answer_id: id }),
    });
    setLoading(false);
    if (res.ok) setEvaluation(await res.json());
    else await failWith(res);
  }

  async function submitTextAnswer() {
    if (!sessionId || !questionId || !answerText.trim()) return;
    setLoading(true);
    const res = await fetch(`${API_URL}/api/v1/interviews/${sessionId}/answers`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ question_id: questionId, transcript: answerText, input_mode: "text" }),
    });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const { id } = await res.json();
    setAnswerId(id);
    await evaluateAnswer(id);
  }

  function retrySamePrompt() {
    setAnswerId(null);
    setRecorderPhase("idle");
    pendingMetrics.current = null;
    setLastVisual(null);
    setLastSpeech(null);
    setAnswerText("");
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
    if (res.ok) setFinished(await res.json());
  }

  function startOver() {
    setSessionId(null);
    setQuestionId(null);
    setPrompt(null);
    setEvaluation(null);
    setFinished(null);
  }

  // ---- Mode picker ----
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
      <div className="space-y-4">
        <ModeCards
          label="Choose a speech type"
          value={selectedMode}
          onChange={setSelectedMode}
          disabled={loading}
          options={modes.map((m) => ({
            value: m.value,
            label: m.label,
            ...(MODE_STYLE[m.value] ?? { description: "", icon: Mic, tone: TONES.indigo }),
          }))}
        />

        <AnswerModeSelector value={answerMode} onChange={setAnswerMode} disabled={loading} />

        <LoadingButton
          onClick={startPractice}
          loading={loading}
          loadingText="Picking your prompt..."
          disabled={!selectedMode}
          className="w-full sm:w-auto"
        >
          Get a random prompt
        </LoadingButton>
      </div>
      </>
    );
  }

  // ---- Finished ----
  if (finished) {
    return (
      <div className="rounded-xl border border-slate-100 p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">Session complete</p>
        <p className="my-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">
          {finished.overall_score != null ? `${finished.overall_score}/10` : "No score yet"}
        </p>
        <button
          onClick={startOver}
          className="mt-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Practice again
        </button>
      </div>
    );
  }

  // ---- Prompt + speak/type + evaluation ----
  return (
    <div className="space-y-4">
      {noticeBanner}
      <div className="rounded-xl border border-slate-100 p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {modes.find((m) => m.value === selectedMode)?.label}
        </p>
        <p className="text-base sm:text-lg text-slate-900 dark:text-slate-50">{prompt}</p>
      </div>

      {loading && !evaluation && answerId ? (
        <LoadingPanel label="Analysing your response..." />
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
              <LoadingButton
                onClick={submitTextAnswer}
                loading={loading}
                loadingText="Scoring your response..."
                disabled={!answerText.trim()}
                className="mt-3 w-full sm:w-auto"
              >
                Submit
              </LoadingButton>
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

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={retrySamePrompt}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              One more try
            </button>
            <LoadingButton onClick={finish} loading={loading} loadingText="Saving your results..." variant="success">
              Finish
            </LoadingButton>
          </div>
        </div>
      )}
    </div>
  );
}
