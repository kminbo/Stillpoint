export interface SessionRecord {
  date: number;
  seconds: number;
  distractions: number;
}

const KEY = "stillpoint-history";

export function clearHistory() {
  localStorage.removeItem(KEY);
}

export function loadHistory(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveSession(rec: SessionRecord): SessionRecord[] {
  const next = [...loadHistory(), rec].slice(-50);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Distractions per 10 minutes of focus. */
export function rate(r: SessionRecord): number {
  return (r.distractions / Math.max(r.seconds, 60)) * 600;
}
