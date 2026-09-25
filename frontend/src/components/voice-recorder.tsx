"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";
import { API_URL } from "@/lib/api-client";
import { GradientSpinner } from "@/components/ui/spinner";

export type RecorderPhase = "idle" | "recording" | "transcribing";

type VoiceResult = {
  answer_id: string;
  transcript: string;
  words_per_minute: number | null;
  filler_word_count: number | null;
};

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Records audio in memory and uploads once on stop. Reports its phase to
 * the parent, which uses it to switch the camera off the instant
 * recording ends — not after transcription finishes.
 */
export function VoiceRecorder({
  sessionId,
  questionId,
  token,
  onResult,
  onPhaseChange,
  onCancel,
  cancelLabel = "Cancel",
}: {
  sessionId: string;
  questionId: string;
  token: string | null;
  onResult: (result: VoiceResult) => void;
  onPhaseChange?: (phase: RecorderPhase) => void;
  /** Shown as a Cancel button while idle (e.g. leave the session). */
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const [phase, setPhaseState] = useState<RecorderPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Set by Cancel so the stop handler discards instead of uploading.
  const cancelledRef = useRef(false);
  // Aborts an in-flight upload/transcription when the user cancels it.
  const uploadRef = useRef<AbortController | null>(null);

  function setPhase(p: RecorderPhase) {
    setPhaseState(p);
    onPhaseChange?.(p);
  }

  function releaseMic() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  }

  // Never leave the microphone open if the component unmounts mid-recording,
  // and don't deliver a result to a screen that's gone.
  useEffect(() => () => { releaseMic(); uploadRef.current?.abort(); }, []);

  async function start() {
    setError(null);
    cancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = handleStop;
      recorderRef.current = recorder;
      startRef.current = Date.now();
      recorder.start();
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setPhase("recording");
    } catch {
      setError("Microphone access was blocked. Allow it in your browser settings, then try again.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    releaseMic();
  }

  function cancel() {
    cancelledRef.current = true;
    recorderRef.current?.stop();
    releaseMic();
  }

  function cancelUpload() {
    uploadRef.current?.abort();
    uploadRef.current = null;
    setError(null);
    setPhase("idle");
  }

  async function handleStop() {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];

    if (cancelledRef.current) {
      // Discarded locally — nothing leaves the browser.
      setPhase("idle");
      return;
    }

    setPhase("transcribing");
    const duration = Math.round((Date.now() - startRef.current) / 1000);
    const form = new FormData();
    form.append("audio", blob, "answer.webm");

    const controller = new AbortController();
    uploadRef.current = controller;
    try {
      const res = await fetch(
        `${API_URL}/api/v1/interviews/${sessionId}/answers/voice?question_id=${questionId}&duration_seconds=${duration}`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
          signal: controller.signal,
        }
      );
      if (controller.signal.aborted) return;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail ?? "We couldn't transcribe that. Please try again.");
        setPhase("idle");
        return;
      }
      const result = await res.json();
      if (controller.signal.aborted) return;
      onResult(result);
    } catch {
      if (controller.signal.aborted) return; // cancelled on purpose
      setError("Couldn't reach the server. Check your connection and try again.");
      setPhase("idle");
    } finally {
      if (uploadRef.current === controller) uploadRef.current = null;
    }
  }

  if (phase === "transcribing") {
    return (
      <div role="status" aria-live="polite" className="animate-fade-in flex flex-col items-center gap-3 py-8 text-center">
        <GradientSpinner size={48} />
        <p className="font-medium text-slate-900 dark:text-slate-100">Transcribing your answer...</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Camera and microphone are off. Your audio is discarded after transcription.
        </p>
        <button
          type="button"
          onClick={cancelUpload}
          className="mt-1 inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <X size={15} /> Cancel and record again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {phase === "idle" ? (
        <button
          type="button"
          onClick={start}
          aria-label="Start recording"
          className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/30 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300 motion-reduce:transition-none"
        >
          <Mic size={34} />
        </button>
      ) : (
        <button
          type="button"
          onClick={stop}
          aria-label="Stop recording and submit"
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-rose-500 opacity-30 motion-reduce:animate-none" />
          <Square size={28} fill="currentColor" className="relative" />
        </button>
      )}

      <div className="text-center">
        {phase === "idle" ? (
          <p className="font-medium text-slate-900 dark:text-slate-100">Tap to start recording</p>
        ) : (
          <>
            <p className="flex items-center justify-center gap-2 font-mono text-lg font-semibold text-rose-600">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-600 motion-reduce:animate-none" />
              {formatTime(seconds)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tap the square when you&apos;re finished</p>
          </>
        )}
      </div>

      {phase === "recording" && (
        <button
          type="button"
          onClick={cancel}
          className="flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <X size={15} /> Cancel and discard
        </button>
      )}
      {phase === "idle" && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <X size={15} /> {cancelLabel}
        </button>
      )}

      {error && (
        <p className="max-w-sm rounded-lg bg-red-50 p-3 text-center text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}{" "}
          <a href="/help/permissions" className="font-medium underline">How to allow access</a>
        </p>
      )}
    </div>
  );
}
