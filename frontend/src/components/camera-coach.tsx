"use client";

import { useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm";

// Rough threshold: how far the estimated head yaw (radians) can be from
// "facing the camera" before we count the sample as looking away. This
// is a coarse, camera-angle-dependent heuristic — coaching signal only,
// never presented as a precise or psychological measurement.
const EYE_CONTACT_YAW_THRESHOLD = 0.35;
const HEAD_MOVEMENT_JITTER_THRESHOLD = 0.06;

type Sample = { faceVisible: boolean; yaw: number; noseX: number; noseY: number };

/**
 * Loads MediaPipe only when this component actually mounts (i.e. only
 * once the candidate enters a camera-enabled session) — never on initial
 * page load, per the performance requirement to not load heavy vision
 * libraries until needed. All frame processing happens in the browser;
 * no frame or video is ever sent anywhere. Only the aggregated numbers
 * computed in `stopAndSubmit` leave this component.
 */
export function CameraCoach({
  sessionId,
  answerId,
  active,
  token,
  onSubmitted,
}: {
  sessionId: string;
  answerId: string | null;
  active: boolean;
  token: string | null;
  onSubmitted?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<import("@mediapipe/tasks-vision").FaceLandmarker | null>(null);
  const samplesRef = useRef<Sample[]>([]);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    async function setup() {
      setStatus("loading");
      try {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const filesetResolver = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          outputFacialTransformationMatrixes: true,
          numFaces: 1,
        });
        if (cancelled) return;
        landmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("running");
        loop();
      } catch {
        setError("Camera or vision model unavailable. Continuing without video coaching.");
        setStatus("error");
      }
    }

    function loop() {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || cancelled) return;

      // detectForVideo throws if the element has no decoded frame yet
      // (readyState < HAVE_CURRENT_DATA) or has zero dimensions — which
      // happens for the first few ticks after play() resolves, and again
      // if the stream drops. Skip those frames instead of crashing.
      if (video.readyState < 2 || video.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      let result;
      try {
        result = landmarker.detectForVideo(video, performance.now());
      } catch {
        // A transient decode error shouldn't kill the whole session —
        // drop this frame and keep going.
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const face = result.faceLandmarks?.[0];
      const matrix = result.facialTransformationMatrixes?.[0]?.data;

      if (face && matrix) {
        // Rough yaw estimate from the rotation matrix (index 2 ~ forward-x component).
        const yaw = Math.asin(Math.max(-1, Math.min(1, matrix[2])));
        const nose = face[1]; // approx nose tip landmark index
        samplesRef.current.push({ faceVisible: true, yaw, noseX: nose.x, noseY: nose.y });
      } else {
        samplesRef.current.push({ faceVisible: false, yaw: 0, noseX: 0, noseY: 0 });
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    setup();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close();
    };
  }, [active]);

  async function stopAndSubmit() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());

    const samples = samplesRef.current;
    samplesRef.current = []; // release immediately — aggregate is all we keep
    if (samples.length === 0 || !answerId) return;

    const visibleSamples = samples.filter((s) => s.faceVisible);
    const facePct = Math.round((visibleSamples.length / samples.length) * 100);
    const lookingAtCamera = visibleSamples.filter((s) => Math.abs(s.yaw) < EYE_CONTACT_YAW_THRESHOLD);
    const eyeContactPct = visibleSamples.length
      ? Math.round((lookingAtCamera.length / visibleSamples.length) * 100)
      : 0;

    // Movement = average frame-to-frame displacement of the nose point,
    // normalized to a 0-100 scale. Higher = more movement, not "good" or
    // "bad" on its own — surfaced as an observable pattern, not a verdict.
    let totalJitter = 0;
    for (let i = 1; i < visibleSamples.length; i++) {
      const a = visibleSamples[i - 1];
      const b = visibleSamples[i];
      totalJitter += Math.hypot(b.noseX - a.noseX, b.noseY - a.noseY);
    }
    const avgJitter = visibleSamples.length > 1 ? totalJitter / (visibleSamples.length - 1) : 0;
    const headMovementScore = Math.min(100, Math.round((avgJitter / HEAD_MOVEMENT_JITTER_THRESHOLD) * 100));

    const notes: string[] = [];
    if (facePct < 70) notes.push("Your face left the frame for parts of this answer.");
    if (eyeContactPct < 50) notes.push("Your gaze moved away from the camera frequently.");
    if (headMovementScore > 70) notes.push("There was a lot of head movement during this answer.");

    await fetch(`${API_URL}/api/v1/interviews/${sessionId}/answers/${answerId}/visual-metrics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        face_visible_pct: facePct,
        eye_contact_pct: eyeContactPct,
        head_movement_score: headMovementScore,
        posture_notes: notes,
      }),
    });
    onSubmitted?.();
  }

  if (!active) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100">
      <video ref={videoRef} muted playsInline className="w-full -scale-x-100 bg-slate-900" />
      <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500">
        <span>
          {status === "loading" && "Loading local video coaching..."}
          {status === "running" && "Video coaching active — processed locally, never uploaded."}
          {status === "error" && (error ?? "Video coaching unavailable.")}
        </span>
        <button onClick={stopAndSubmit} className="font-medium text-slate-700 underline">
          Save visual feedback
        </button>
      </div>
    </div>
  );
}
