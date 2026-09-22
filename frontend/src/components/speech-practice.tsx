"use client";

import { useAuth } from "@/lib/auth-context";
import { useCallback, useEffect, useState } from "react";
import { VoiceRecorder } from "@/components/voice-recorder";
import { CameraCoach } from "@/components/camera-coach";
import { AnswerModeSelector, type AnswerMode } from "@/components/ui/answer-mode-selector";
import { LoadingButton, LoadingPanel } from "@/components/ui/spinner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Mode = { value: string; label: string };
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

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [answerId, setAnswerId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState<{ overall_score: number | null } | null>(null);

  const authHeaders = useCallback(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    }),
    [token]
  );

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
    if (!res.ok) return;
    const data = await res.json();
    setSessionId(data.session_id);
    setQuestionId(data.question_id);
    setPrompt(data.prompt);
    setAnswerId(null);
    setAnswerText("");
    setEvaluation(null);
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
  if (!sessionId) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Choose a speech type</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setSelectedMode(m.value)}
              className={`rounded-lg border px-3 py-2.5 text-sm ${
                selectedMode === m.value
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

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
              <CameraCoach sessionId={sessionId} answerId={answerId} active={true} token={token} />
            </div>
          )}
          {answerMode !== "text" ? (
            <VoiceRecorder
              sessionId={sessionId}
              questionId={questionId!}
              token={token}
              onResult={(result) => {
                setAnswerId(result.answer_id);
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
        <div className="rounded-xl border border-slate-100 p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
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
          <div className="flex flex-wrap gap-2">
            <button
              onClick={retrySamePrompt}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              One more try
            </button>
            <button
              onClick={finish}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              Finish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
