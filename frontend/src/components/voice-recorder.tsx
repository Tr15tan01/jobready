"use client";

import { useRef, useState } from "react";
import { API_URL } from "@/lib/api-client";


type VoiceResult = {
  answer_id: string;
  transcript: string;
  words_per_minute: number | null;
  filler_word_count: number | null;
};

/**
 * Records audio entirely in memory (a MediaRecorder Blob held in a React
 * ref, never written to disk) and uploads it once, on stop, directly to
 * the transcription endpoint. The blob is discarded immediately after
 * the fetch call resolves — this component never accumulates a video/
 * audio history (section 15/16/31).
 */
export function VoiceRecorder({
  sessionId,
  questionId,
  token,
  onResult,
}: {
  sessionId: string;
  questionId: string;
  token: string | null;
  onResult: (result: VoiceResult) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = handleStop;
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access denied or unavailable.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }

  async function handleStop() {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = []; // release references immediately
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    setUploading(true);
    const form = new FormData();
    form.append("audio", blob, "answer.webm");

    const res = await fetch(
      `${API_URL}/api/v1/interviews/${sessionId}/answers/voice` +
        `?question_id=${questionId}&duration_seconds=${durationSeconds}`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }
    );
    setUploading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.detail ?? "Could not transcribe your answer.");
      return;
    }
    onResult(await res.json());
  }

  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex items-center gap-3">
        {!recording ? (
          <button
            onClick={startRecording}
            disabled={uploading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {uploading ? "Transcribing..." : "Start recording"}
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            Stop ({seconds}s)
          </button>
        )}
        <p className="text-xs text-slate-400">
          Audio is transcribed and discarded immediately — never stored.
        </p>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
