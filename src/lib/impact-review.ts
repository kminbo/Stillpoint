export interface ImpactSession {
  created_at: string;
  seconds: number;
  distractions: number;
  timer_minutes: number | null;
  ended_by: string;
}
export interface ImpactFeedback {
  created_at: string;
  rating: number;
}

export const MIN_SESSIONS_PER_SIDE = 5;
export const WINDOW_DAYS = 14;

type Direction = "higher" | "lower";
export interface MetricChange {
  label: string;
  before: number | null;
  after: number | null;
  better: Direction;
  result: "improved" | "worsened" | "same" | "unknown";
}

export interface ImpactReview {
  verdict: "improved" | "worsened" | "mixed" | "too-early";
  beforeSessions: number;
  afterSessions: number;
  metrics: MetricChange[];
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function metricsFor(sessions: ImpactSession[], ratings: number[]) {
  const secs = sessions.reduce((s, r) => s + r.seconds, 0);
  const timed = sessions.filter((r) => r.timer_minutes !== null);
  return {
    rating: avg(ratings),
    distractions: secs ? (sessions.reduce((s, r) => s + r.distractions, 0) / secs) * 600 : null,
    minutes: sessions.length ? secs / sessions.length / 60 : null,
    shortPct: sessions.length ? (sessions.filter((r) => r.seconds < 120).length / sessions.length) * 100 : null,
    timerPct: timed.length ? (timed.filter((r) => r.ended_by === "timer").length / timed.length) * 100 : null,
  };
}

/** Relative change needed before a metric counts as moved (10%). */
const THRESHOLD = 0.1;

function compare(before: number | null, after: number | null, better: Direction): MetricChange["result"] {
  if (before === null || after === null) return "unknown";
  const base = Math.max(Math.abs(before), 0.0001);
  const delta = (after - before) / base;
  if (Math.abs(delta) < THRESHOLD) return "same";
  return (delta > 0) === (better === "higher") ? "improved" : "worsened";
}

/** Compares usage in the 14 days before vs after a change shipped. */
export function reviewImpact(shippedAt: string, sessions: ImpactSession[], feedback: ImpactFeedback[]): ImpactReview {
  const t = new Date(shippedAt).getTime();
  const win = WINDOW_DAYS * 86400000;
  const inRange = (d: string, from: number, to: number) => {
    const x = new Date(d).getTime();
    return x >= from && x < to;
  };
  const before = sessions.filter((s) => inRange(s.created_at, t - win, t));
  const after = sessions.filter((s) => inRange(s.created_at, t, t + win));
  const b = metricsFor(before, feedback.filter((f) => inRange(f.created_at, t - win, t)).map((f) => f.rating));
  const a = metricsFor(after, feedback.filter((f) => inRange(f.created_at, t, t + win)).map((f) => f.rating));
  const defs: [keyof typeof b, string, Direction][] = [
    ["rating", "Avg rating", "higher"],
    ["distractions", "Distractions / 10 min", "lower"],
    ["minutes", "Avg session length (min)", "higher"],
    ["shortPct", "Sessions under 2 min (%)", "lower"],
    ["timerPct", "Timers finished (%)", "higher"],
  ];
  const round = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);
  const metrics = defs.map(([k, label, better]) => ({
    label, better, before: round(b[k]), after: round(a[k]), result: compare(b[k], a[k], better),
  }));
  if (before.length < MIN_SESSIONS_PER_SIDE || after.length < MIN_SESSIONS_PER_SIDE) {
    return { verdict: "too-early", beforeSessions: before.length, afterSessions: after.length, metrics };
  }
  // Rating counts double: it is the users' own opinion.
  let score = 0;
  for (const m of metrics) {
    const w = m.label === "Avg rating" ? 2 : 1;
    if (m.result === "improved") score += w;
    if (m.result === "worsened") score -= w;
  }
  const verdict = score >= 2 ? "improved" : score <= -2 ? "worsened" : "mixed";
  return { verdict, beforeSessions: before.length, afterSessions: after.length, metrics };
}
