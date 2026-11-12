import { classifyHeadDirection, type HeadTrackingOptions, type HeadSignal } from "./head-direction";
import wasmBinary from "@/assets/vision_wasm_internal.wasm.asset.json";

export type AttentionState = "loading" | "focused" | "away" | "head-tilted" | "unavailable";

type AttentionListener = (state: AttentionState) => void;

type Signal = HeadSignal;

const AWAY_DELAY_MS = 700;
const HEAD_TILT_DELAY_MS = 1400;
const RETURN_DELAY_MS = 120;
// Clear head tilt promptly when the head straightens.
const REFOCUS_DELAY_MS = 400;
const SAMPLE_INTERVAL_MS = 100;

export interface AttentionEngine {
  init(): Promise<void>;
  start(): void;
  stop(): void;
  onState(listener: AttentionListener): () => void;
}

/**
 * Watches head direction and tilt, independent of sitting position and distance.
 * Frames and landmarks never leave the browser; only a coarse state is emitted.
 */
export function createAttentionEngine(video: HTMLVideoElement, tracking: HeadTrackingOptions = { focus: true, posture: true }): AttentionEngine {
  const listeners = new Set<AttentionListener>();
  let landmarker: import("@mediapipe/tasks-vision").FaceLandmarker | null = null;
  let running = false;
  let disposed = false;
  let frameId: number | null = null;
  let lastSample = 0;
  let lastVideoTime = -1;
  let candidate: Signal = "focused";
  let candidateSince = 0;
  let current: AttentionState = "loading";

  const emit = (next: AttentionState) => {
    if (current === next) return;
    current = next;
    listeners.forEach((listener) => listener(next));
  };

  const observe = (next: Signal, now: number) => {
    if (candidate !== next) {
      candidate = next;
      candidateSince = now;
      return;
    }
    const delay =
      next === "away"
        ? AWAY_DELAY_MS
        : next === "head-tilted"
          ? HEAD_TILT_DELAY_MS
          : current === "head-tilted"
            ? REFOCUS_DELAY_MS
            : RETURN_DELAY_MS;
    if (now - candidateSince >= delay) emit(next);
  };

  const loop = () => {
    if (!running || !landmarker) return;
    const now = performance.now();

    if (
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.currentTime !== lastVideoTime &&
      now - lastSample >= SAMPLE_INTERVAL_MS
    ) {
      lastSample = now;
      lastVideoTime = video.currentTime;
      const result = landmarker.detectForVideo(video, now);
      const headMatrix = result.facialTransformationMatrixes[0]?.data;
      observe(classifyHeadDirection(headMatrix, current, tracking), now);
    }

    frameId = window.setTimeout(loop, SAMPLE_INTERVAL_MS);
  };

  return {
    async init() {
      try {
        const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
        const loaded = await FaceLandmarker.createFromOptions(
          {
            wasmLoaderPath: "/mediapipe/wasm/vision_wasm_internal.js",
            wasmBinaryPath: wasmBinary.url,
          },
          {
            baseOptions: { modelAssetPath: "/models/face_landmarker.task", delegate: "GPU" },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFacialTransformationMatrixes: true,
            minFaceDetectionConfidence: 0.55,
            minFacePresenceConfidence: 0.55,
            minTrackingConfidence: 0.55,
          },
        );
        if (disposed) {
          loaded.close();
          return;
        }
        landmarker = loaded;
        emit("focused");
      } catch {
        if (!disposed) emit("unavailable");
      }
    },
    start() {
      if (running || !landmarker) return;
      running = true;
      candidateSince = performance.now();
      frameId = window.setTimeout(loop, SAMPLE_INTERVAL_MS);
    },
    stop() {
      disposed = true;
      running = false;
      if (frameId !== null) window.clearTimeout(frameId);
      frameId = null;
      landmarker?.close();
      landmarker = null;
    },
    onState(listener) {
      listeners.add(listener);
      listener(current);
      return () => listeners.delete(listener);
    },
  };
}
