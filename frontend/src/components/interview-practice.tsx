"use client";

import { useAuth } from "@/lib/auth-context";
import { useCallback, useState } from "react";
import { VoiceRecorder } from "@/components/voice-recorder";
import { CameraCoach } from "@/components/camera-coach";
import { AnswerModeSelector, type AnswerMode } from "@/components/ui/answer-mode-selector";
import { LoadingButton, LoadingPanel } from "@/components/ui/spinner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const MODES = [
  { value: "behavioral", label: "Behavioral" },
  { value: "domain", label: "Domain deep-dive" },
  { value: "hr", label: "HR" },
  { value: "general", label: "General" },
] as const;

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

  const [mode, setMode] = useState<(typeof MODES)[number]["value"]>("behavioral");
  const [answerMode, setAnswerMode] = useState<AnswerMode>("text");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answerId, setAnswerId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState<{ overall_score: number | null } | null>(null);

  const authHeaders = useCallback(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    }),
    [token]
  );

  async function startSession() {
    setLoading(true);
    setCompleted(null);
    const res = await fetch(`${API_URL}/api/v1/interviews`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        mode,
        difficulty: "medium",
        // Video answers are still transcribed from audio; the camera adds
        // on-device visual analysis on top.
        input_mode: answerMode === "video" ? "voice" : answerMode,
        camera_enabled: answerMode === "video",
      }),
    });
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setSessionId(data.id);
    setQuestion(data.questions[0]);
    setAnswerId(null);
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
  }

  async function retry() {
    setAnswerText("");
    setAnswerId(null);
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
    if (!res.ok) return;
    setQuestion(await res.json());
    setAnswerText("");
    setAnswerId(null);
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

  if (!sessionId) {
    return (
      <div className="rounded-xl border border-slate-100 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Choose an interview mode</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                mode === m.value
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              {m.label}
            </button>
          ))}
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
              <CameraCoach sessionId={sessionId} answerId={answerId} active={true} token={token} />
            </div>
          )}
          {answerMode !== "text" && question ? (
            <VoiceRecorder
              sessionId={sessionId}
              questionId={question.id}
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
        <div className="rounded-xl border border-slate-100 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
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
          <div className="flex flex-wrap gap-2">
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
