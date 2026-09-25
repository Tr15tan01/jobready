"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, ShieldCheck, VideoOff } from "lucide-react";
import { GradientSpinner } from "@/components/ui/spinner";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm";
const DEVICE_KEY = "jr_camera_device";
// Analyse ~10 frames a second: plenty for coaching signals, and far lighter
// on low-end laptops and phones than every animation frame.
const SAMPLE_EVERY_MS = 100;

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
type Status = "starting" | "running" | "preview-only" | "error";
type Landmarker = import("@mediapipe/tasks-vision").FaceLandmarker;

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

/** A specific, actionable message for each way getUserMedia can fail. */
function cameraErrorMessage(err: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "The camera only works on a secure (https) page.";
  }
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera permission is blocked. Allow it in your browser's site settings, then press Try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found. Check it's connected and not switched off (some laptops have a camera key or privacy shutter).";
    case "NotReadableError":
    case "AbortError":
      return "Your camera is being used by another app (Zoom, Teams, the Camera app…). Close it, then press Try again.";
    default:
      return "We couldn't start your camera.";
  }
}

async function openCamera(deviceId: string | null): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException("getUserMedia unavailable", "NotFoundError");
  }
  // Loose constraints: `ideal` never fails on a camera that can't match it.
  // The preview is cropped to portrait on screen, so any camera shape works.
  const attempts: MediaStreamConstraints[] = [
    { video: { ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }), width: { ideal: 640 }, height: { ideal: 480 } } },
    { video: deviceId ? { deviceId: { exact: deviceId } } : true },
    { video: true },
  ];
  let lastErr: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastErr = err;
      // Permission problems won't be fixed by different constraints.
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError")) break;
    }
  }
  throw lastErr;
}

/** Face analysis model: GPU first, then CPU (some laptops' GPUs aren't supported). */
async function loadLandmarker(): Promise<Landmarker> {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO" as const,
    outputFacialTransformationMatrixes: true,
    numFaces: 1,
  });
  try {
    return await FaceLandmarker.createFromOptions(fileset, options("GPU"));
  } catch {
    return await FaceLandmarker.createFromOptions(fileset, options("CPU"));
  }
}

/**
 * On-device visual coaching. Everything runs in the browser; no frame ever
 * leaves it.
 *
 * `active` is the single switch. The moment it goes false, the camera and
 * analysis loop stop immediately — before transcription, not after — and
 * the summary is passed to `onMetrics`.
 *
 * The camera starts first and independently of the analysis model, so a
 * device whose GPU/WASM can't run the model still gets a working preview.
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
  const landmarkerRef = useRef<Landmarker | null>(null);
  const samplesRef = useRef<Sample[]>([]);
  const rafRef = useRef<number | null>(null);
  const onMetricsRef = useRef(onMetrics);
  onMetricsRef.current = onMetrics;

  const [status, setStatus] = useState<Status>("starting");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(() => {
    try { return typeof window !== "undefined" ? localStorage.getItem(DEVICE_KEY) : null; } catch { return null; }
  });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let lastSample = 0;
    samplesRef.current = [];
    setStatus("starting");
    setError(null);

    function loop(now: number) {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || cancelled) return;
      rafRef.current = requestAnimationFrame(loop);
      if (now - lastSample < SAMPLE_EVERY_MS) return;
      // detectForVideo throws before the element has a decoded frame.
      if (video.readyState < 2 || video.videoWidth === 0) return;
      lastSample = now;
      try {
        const result = landmarker.detectForVideo(video, now);
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
    }

    (async () => {
      // 1. Camera first — the user sees themselves as soon as possible.
      let stream: MediaStream;
      try {
        stream = await openCamera(deviceId);
      } catch (err) {
        // A remembered camera may have been unplugged: forget it and retry once.
        if (deviceId && err instanceof DOMException && (err.name === "NotFoundError" || err.name === "OverconstrainedError")) {
          try { localStorage.removeItem(DEVICE_KEY); } catch {}
          if (!cancelled) setDeviceId(null);
          return;
        }
        if (!cancelled) { setError(cameraErrorMessage(err)); setStatus("error"); }
        return;
      }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      // Labels are only available after permission is granted.
      navigator.mediaDevices.enumerateDevices()
        .then((all) => { if (!cancelled) setDevices(all.filter((d) => d.kind === "videoinput")); })
        .catch(() => {});

      // 2. Then the analysis model. If it can't run here, keep the preview.
      try {
        const landmarker = await loadLandmarker();
        if (cancelled) { landmarker.close(); return; }
        landmarkerRef.current = landmarker;
        setStatus("running");
        rafRef.current = requestAnimationFrame(loop);
      } catch {
        if (!cancelled) setStatus("preview-only");
      }
    })();

    // Runs when `active` flips to false (or on unmount): stop EVERYTHING
    // now, then hand over the summary.
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      onMetricsRef.current(summarise(samplesRef.current));
      samplesRef.current = [];
    };
  }, [active, attempt, deviceId]);

  function chooseDevice(id: string) {
    try { localStorage.setItem(DEVICE_KEY, id); } catch {}
    setDeviceId(id);
  }

  if (!active) return null;

  return (
    <div className="animate-fade-in mx-auto w-full max-w-[20rem] overflow-hidden rounded-2xl border border-violet-200 sm:max-w-[22rem] dark:border-violet-900">
      {/* Portrait frame: the camera image is cropped to 3:4 on every device. */}
      <div className="relative aspect-[3/4] max-h-[60vh] w-full bg-slate-900">
        <video ref={videoRef} muted playsInline autoPlay className="h-full w-full max-w-full -scale-x-100 object-cover" />
        {status === "running" && (
          // Framing guide — where to keep your face.
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-[18%] top-[14%] bottom-[30%] rounded-[50%] border-2 border-dashed border-white/35" />
        )}
        {status === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/80 text-sm text-slate-200">
            <GradientSpinner size={40} />
            Starting your camera...
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900 p-5 text-center text-sm text-slate-200">
            <VideoOff size={28} aria-hidden="true" />
            <p>{error}</p>
            <p className="text-xs text-slate-400">You can still answer with audio.</p>
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="mt-1 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-white/10 px-4 font-medium text-white hover:bg-white/20"
            >
              <RefreshCw size={14} aria-hidden="true" /> Try again
            </button>
            <a href="/help/permissions" className="text-xs font-medium text-violet-300 underline">How to allow camera access</a>
          </div>
        )}
        {status === "preview-only" && (
          <p className="absolute inset-x-2 bottom-2 rounded-lg bg-slate-900/80 px-2 py-1.5 text-center text-[11px] text-slate-200">
            Face analysis isn&apos;t supported on this device — your preview still works.
          </p>
        )}
      </div>
      {devices.length > 1 && (
        <label className="flex items-center gap-2 border-t border-violet-100 bg-white px-3 py-2 text-xs text-slate-600 dark:border-violet-900 dark:bg-slate-900 dark:text-slate-300">
          <span className="shrink-0 font-medium">Camera</span>
          <select
            value={deviceId ?? streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId ?? ""}
            onChange={(e) => chooseDevice(e.target.value)}
            className="min-w-0 flex-1 truncate rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
          >
            {devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>
            ))}
          </select>
        </label>
      )}
      <p className="flex items-center gap-2 bg-violet-50 px-3 py-2 text-xs text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
        <ShieldCheck size={14} className="shrink-0" aria-hidden="true" />
        <span>
          Analysed on your device. Video is never recorded or uploaded.{" "}
          <a href="/help/video-privacy" className="font-medium underline">How it works</a>
        </span>
      </p>
    </div>
  );
}
