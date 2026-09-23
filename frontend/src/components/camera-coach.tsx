"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, VideoOff } from "lucide-react";
import { GradientSpinner } from "@/components/ui/spinner";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm";

// Coarse heuristics — directional coaching signals only, never presented
// as precise or psychological measurements.
const EYE_CONTACT_YAW_THRESHOLD = 0.35;
const HEAD_MOVEMENT_JITTER_THRESHOLD = 0.06;

export type VisualMetrics = {
  face_visible_pct: number;
  eye_contact_pct: number;
  head_movement_score: number;
  posture_notes: string[];
};

type Sample = { faceVisible: boolean; yaw: number; noseX: number; noseY: number };

function summarise(samples: Sample[]): VisualMetrics | null {
  if (samples.length === 0) return null;
  const visible = samples.filter((s) => s.faceVisible);
  const facePct = Math.round((visible.length / samples.length) * 100);
  const looking = visible.filter((s) => Math.abs(s.yaw) < EYE_CONTACT_YAW_THRESHOLD);
  const eyePct = visible.length ? Math.round((looking.length / visible.length) * 100) : 0;

  let jitter = 0;
  for (let i = 1; i < visible.length; i++) {
    jitter += Math.hypot(visible[i].noseX - visible[i - 1].noseX, visible[i].noseY - visible[i - 1].noseY);
  }
  const avg = visible.length > 1 ? jitter / (visible.length - 1) : 0;
  const movement = Math.min(100, Math.round((avg / HEAD_MOVEMENT_JITTER_THRESHOLD) * 100));

  // Observable-behaviour language only.
  const notes: string[] = [];
  if (facePct < 70) notes.push("Your face left the frame for parts of this answer.");
  if (eyePct < 50) notes.push("Your gaze moved away from the camera frequently.");
  if (movement > 70) notes.push("There was a lot of head movement during this answer.");
  return { face_visible_pct: facePct, eye_contact_pct: eyePct, head_movement_score: movement, posture_notes: notes };
}

/**
 * On-device visual coaching. Everything runs in the browser; no frame ever
 * leaves it.
 *
 * `active` is the single switch. The moment it goes false, the camera and
 * analysis loop stop immediately — before transcription, not after — and
 * the summary is passed to `onMetrics`. The parent submits it once the
 * answer has an id, since metrics can't be saved against an answer that
 * doesn't exist yet.
 */
export function CameraCoach({
  active,
  onMetrics,
}: {
  active: boolean;
  onMetrics: (metrics: VisualMetrics | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<import("@mediapipe/tasks-vision").FaceLandmarker | null>(null);
  const samplesRef = useRef<Sample[]>([]);
  const rafRef = useRef<number | null>(null);
  const onMetricsRef = useRef(onMetrics);
  onMetricsRef.current = onMetrics;

  const [status, setStatus] = useState<"loading" | "running" | "error">("loading");

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    samplesRef.current = [];
    setStatus("loading");

    function loop() {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || cancelled) return;
      // detectForVideo throws before the element has a decoded frame.
      if (video.readyState < 2 || video.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      try {
        const result = landmarker.detectForVideo(video, performance.now());
        const face = result.faceLandmarks?.[0];
        const matrix = result.facialTransformationMatrixes?.[0]?.data;
        if (face && matrix) {
          const yaw = Math.asin(Math.max(-1, Math.min(1, matrix[2])));
          samplesRef.current.push({ faceVisible: true, yaw, noseX: face[1].x, noseY: face[1].y });
        } else {
          samplesRef.current.push({ faceVisible: false, yaw: 0, noseX: 0, noseY: 0 });
        }
      } catch {
        // Drop a bad frame rather than ending the session.
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    (async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          outputFacialTransformationMatrixes: true,
          numFaces: 1,
        });
        if (cancelled) return landmarker.close();
        landmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("running");
        loop();
      } catch {
        setStatus("error");
      }
    })();

    // Runs when `active` flips to false (or on unmount): stop EVERYTHING
    // now, then hand over the summary.
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      onMetricsRef.current(summarise(samplesRef.current));
      samplesRef.current = [];
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="animate-fade-in overflow-hidden rounded-2xl border border-violet-200 dark:border-violet-900">
      <div className="relative aspect-video bg-slate-900">
        <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/80 text-sm text-slate-200">
            <GradientSpinner size={40} />
            Starting your camera...
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900 p-4 text-center text-sm text-slate-200">
            <VideoOff size={28} />
            Camera unavailable — you can still answer by voice.
            <a href="/help/permissions" className="font-medium text-violet-300 underline">How to allow camera access</a>
          </div>
        )}
      </div>
      <p className="flex items-center gap-2 bg-violet-50 px-3 py-2 text-xs text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
        <ShieldCheck size={14} className="shrink-0" />
        Analysed on your device. Video is never recorded or uploaded.{" "}
        <a href="/help/video-privacy" className="font-medium underline">How it works</a>
      </p>
    </div>
  );
}
