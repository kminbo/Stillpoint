import { classifyHeadDirection, type HeadTrackingOptions, type HeadSignal } from "./head-direction";

export type AttentionState = "loading" | "focused" | "away" | "head-tilted" | "unavailable";

type AttentionListener = (state: AttentionState) => void;

type Signal = HeadSignal;

const AWAY_DELAY_MS = 700;
const HEAD_TILT_DELAY_MS = 1400;
const RETURN_DELAY_MS = 120;
// Clear head tilt promptly when the head straightens.
const REFOCUS_DELAY_MS = 400;
const SAMPLE_INTERVAL_MS = 100;

// Chrome's ImageCapture is not in the TS DOM lib yet.
type FrameGrabber = { grabFrame(): Promise<ImageBitmap> };
type FrameGrabberCtor = new (track: MediaStreamTrack) => FrameGrabber;

/**
 * Ticks from a dedicated worker. Main-thread timers in a hidden tab are throttled
 * to 1/s, and to 1/min after a few minutes; worker timers are not.
 */
function createTicker(intervalMs: number, onTick: () => void) {
  try {
    const source = `setInterval(() => postMessage(0), ${intervalMs});`;
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = onTick;
    return () => worker.terminate();
  } catch {
    const id = window.setInterval(onTick, intervalMs);
    return () => window.clearInterval(id);
  }
}

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
export function createAttentionEngine(
  video: HTMLVideoElement,
  tracking: HeadTrackingOptions = { focus: true, posture: true },
): AttentionEngine {
  const listeners = new Set<AttentionListener>();
  let landmarker: import("@mediapipe/tasks-vision").FaceLandmarker | null = null;
  let running = false;
  let disposed = false;
  let stopTicker: (() => void) | null = null;
  let busy = false;
  let grabber: FrameGrabber | null = null;
  let grabberTrack: MediaStreamTrack | null = null;
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

  /**
   * In a hidden tab Chrome may stop painting new frames into the <video>
   * (it does on macOS), so detection would keep seeing the last visible frame.
   * Pull frames straight from the camera track instead.
   */
  const grabHiddenFrame = async (): Promise<ImageBitmap | null> => {
    const Ctor = (window as unknown as { ImageCapture?: FrameGrabberCtor }).ImageCapture;
    const track =
      video.srcObject instanceof MediaStream ? video.srcObject.getVideoTracks()[0] : undefined;
    if (!Ctor || !track || track.readyState !== "live") return null;
    if (grabberTrack !== track) {
      grabber = new Ctor(track);
      grabberTrack = track;
    }
    try {
      return (await grabber?.grabFrame()) ?? null;
    } catch {
      return null;
    }
  };

  const detect = (source: TexImageSource, now: number) => {
    if (!landmarker) return;
    const result = landmarker.detectForVideo(source, now);
    const headMatrix = result.facialTransformationMatrixes[0]?.data;
    observe(classifyHeadDirection(headMatrix, current, tracking), now);
  };

  const tick = async () => {
    if (!running || !landmarker || busy) return;
    busy = true;
    try {
      if (document.hidden) {
        const frame = await grabHiddenFrame();
        if (frame) {
          if (running && landmarker) detect(frame, performance.now());
          frame.close();
          return;
        }
      }
      if (
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.currentTime !== lastVideoTime
      ) {
        lastVideoTime = video.currentTime;
        detect(video, performance.now());
      }
    } finally {
      busy = false;
    }
  };

  return {
    async init() {
      try {
        const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
        const loaded = await FaceLandmarker.createFromOptions(
          {
            wasmLoaderPath: "/mediapipe/wasm/vision_wasm_internal.js",
            wasmBinaryPath: "/mediapipe/wasm/vision_wasm_internal.wasm",
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
      stopTicker = createTicker(SAMPLE_INTERVAL_MS, () => void tick());
    },
    stop() {
      disposed = true;
      running = false;
      stopTicker?.();
      stopTicker = null;
      grabber = null;
      grabberTrack = null;
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
