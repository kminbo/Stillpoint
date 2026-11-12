/**
 * Posture engine abstraction — the integration point for
 * Google MediaPipe Pose Landmarker.
 *
 * The UI never talks to a concrete model. It renders a <video> element and
 * hands it to a `PoseEngine`. To wire up real pose estimation later:
 *
 *   1. `bun add @mediapipe/tasks-vision`
 *   2. Implement `createPoseEngine` with PoseLandmarker:
 *
 *        const fileset = await FilesetResolver.forVisionTasks(
 *          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
 *        );
 *        const landmarker = await PoseLandmarker.createFromOptions(fileset, {
 *          baseOptions: {
 *            modelAssetPath: "/models/pose_landmarker_lite.task",
 *            delegate: "GPU",
 *          },
 *          runningMode: "VIDEO",
 *          numPoses: 1,
 *        });
 *
 *   3. In `start()`, run a requestAnimationFrame loop that calls
 *      `landmarker.detectForVideo(video, performance.now())`, derives a
 *      `PostureReading`, and emits it through the `onReading` callback.
 *   4. Render overlays (skeleton, posture score) in `PostureMonitor`.
 */

export interface PostureReading {
  /** ms timestamp of the frame the reading came from */
  timestamp: number;
  /** true when a pose was detected in the frame */
  poseDetected: boolean;
  /** 0–100 posture quality relative to the calibration baseline */
  score: number;
  /** semantic status derived from the score */
  status: "aligned" | "drifting" | "slouched" | "no-pose";
}

export type ReadingListener = (reading: PostureReading) => void;

export interface PoseEngine {
  readonly name: string;
  /** Load model + WASM assets. */
  init(): Promise<void>;
  /** Begin the per-frame detection loop on the attached video element. */
  start(): void;
  /** Stop the loop and free per-session resources (model can be reused). */
  stop(): void;
  /** Subscribe to posture readings; returns an unsubscribe function. */
  onReading(listener: ReadingListener): () => void;
}

/**
 * Placeholder engine used until MediaPipe is integrated.
 * Emits a stable "aligned" reading so the session UI has data to bind to.
 */
export function createPoseEngine(_video: HTMLVideoElement): PoseEngine {
  const listeners = new Set<ReadingListener>();
  let running = false;
  let rafId: number | null = null;

  const emit = (reading: PostureReading) => {
    listeners.forEach((listener) => listener(reading));
  };

  // TODO: replace with the MediaPipe Pose Landmarker frame loop.
  const loop = () => {
    if (!running) return;
    emit({
      timestamp: performance.now(),
      poseDetected: true,
      score: 100,
      status: "aligned",
    });
    rafId = requestAnimationFrame(loop);
  };

  return {
    name: "placeholder",
    async init() {
      /* no-op until MediaPipe is wired in */
    },
    start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },
    onReading(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
