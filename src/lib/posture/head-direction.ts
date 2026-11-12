export interface HeadTrackingOptions {
  focus: boolean;
  posture: boolean;
}

export type HeadSignal = "focused" | "away" | "head-tilted";

/** Face Landmarker head rotation only; matrix translation and scale are ignored. */
export function classifyHeadDirection(
  matrix: readonly number[] | undefined,
  previous: string,
  tracking: HeadTrackingOptions,
): HeadSignal {
  if (!matrix || matrix.length !== 16 || !matrix.every(Number.isFinite)) {
    return tracking.focus ? "away" : "focused";
  }
  const [r00, r10, r20, , r01, r11, r21, , r02, r12, r22] = matrix;
  // Narrow every rotation entry explicitly; checking array length does not
  // guarantee indexed entries exist under strict TypeScript array checking.
  if (
    r00 === undefined || r10 === undefined || r20 === undefined ||
    r01 === undefined || r11 === undefined || r21 === undefined ||
    r02 === undefined || r12 === undefined || r22 === undefined
  ) return tracking.focus ? "away" : "focused";
  // MediaPipe matrices are column-major. Normalize rotation columns so moving
  // closer/further or shifting the torso cannot become a head-tilt signal.
  const sx = Math.hypot(r00, r10, r20);
  const sy = Math.hypot(r01, r11, r21);
  const sz = Math.hypot(r02, r12, r22);
  if (Math.min(sx, sy, sz) < 1e-6) return tracking.focus ? "away" : "focused";
  const degrees = 180 / Math.PI;
  const turn = Math.abs(Math.asin(Math.max(-1, Math.min(1, r02 / sz)))) * degrees;
  // Signed pitch: positive = looking down, negative = looking up.
  const signedPitch = Math.atan2(-r12 / sz, r22 / sz) * degrees;
  const pitch = Math.abs(signedPitch);
  const roll = Math.abs(Math.atan2(-r01 / sy, r00 / sx)) * degrees;
  const wasAway = previous === "away";
  if (tracking.focus && turn > (wasAway ? 20 : 25)) return "away";
  // Looking up above the screen means attention has left it.
  if (tracking.focus && -signedPitch > (wasAway ? 12 : 18)) return "away";
  const tilted = previous === "head-tilted";
  if (tracking.posture && (pitch > (tilted ? 20 : 25) || roll > (tilted ? 15 : 20))) {
    return "head-tilted";
  }
  return "focused";
}