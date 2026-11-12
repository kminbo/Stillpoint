export interface TrackingPrefs {
  focus: boolean;
  /** Head tilt tracking; retains its legacy key for stored usage compatibility. */
  posture: boolean;
}

/** Both trackers are always on; kept as an object so stored usage stays compatible. */
export const trackingPrefs: TrackingPrefs = {
  focus: true,
  posture: true,
};

export const SESSION_LENGTHS = [15, 25, 45, 60] as const;

export type SessionMinutes = (typeof SESSION_LENGTHS)[number] | null;