export interface UsageRow {
  seconds: number;
  distractions: number;
  focus_tracking: boolean;
  posture_tracking: boolean;
  blur: boolean;
  sound: boolean;
  notification: boolean;
  timer_minutes: number | null;
  ended_by: string;
}

export interface FeedbackRow {
  rating: number;
  comment: string | null;
}

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

export function summarizeUsage(sessions: UsageRow[], feedback: FeedbackRow[]) {
  const total = sessions.length;
  const totalSeconds = sessions.reduce((s, r) => s + r.seconds, 0);
  const totalDistractions = sessions.reduce((s, r) => s + r.distractions, 0);
  const count = (fn: (r: UsageRow) => boolean) => sessions.filter(fn).length;
  const timerChoices: Record<string, number> = {};
  for (const r of sessions) {
    const k = r.timer_minutes === null ? "none" : `${r.timer_minutes}`;
    timerChoices[k] = (timerChoices[k] ?? 0) + 1;
  }
  const withTimer = sessions.filter((r) => r.timer_minutes !== null);
  return {
    sessions: total,
    avgMinutes: total ? Math.round(totalSeconds / total / 6) / 10 : 0,
    distractionsPer10Min: totalSeconds ? Math.round((totalDistractions / totalSeconds) * 6000) / 10 : 0,
    shortSessionsUnder2MinPct: pct(count((r) => r.seconds < 120), total),
    focusTrackerOnPct: pct(count((r) => r.focus_tracking), total),
    postureTrackerOnPct: pct(count((r) => r.posture_tracking), total),
    blurOnPct: pct(count((r) => r.blur), total),
    soundOnPct: pct(count((r) => r.sound), total),
    notificationOnPct: pct(count((r) => r.notification), total),
    timerChoices,
    timerCompletedPct: pct(withTimer.filter((r) => r.ended_by === "timer").length, withTimer.length),
    reviews: feedback.length,
    avgRating: feedback.length ? Math.round((feedback.reduce((s, f) => s + f.rating, 0) / feedback.length) * 10) / 10 : null,
  };
}
