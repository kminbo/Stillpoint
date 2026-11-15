/**
 * Fixed product feedback topics. Only their counts reach the AI review agent; the
 * free-text note below is separate and never reaches an AI model. Keep in sync
 * with the check in supabase/migrations/20261115120000_feedback_topics.sql and
 * the per-topic guidance in src/lib/ai/review-agent.server.ts.
 */
export const FEEDBACK_OPTIONS = [
  "",
  "Alerts felt too frequent",
  "Alerts were helpful",
  "Head tracking felt inaccurate",
  "Camera setup was difficult",
  "The session timer was helpful",
  "The app felt slow",
  "The session helped me focus",
  "The screen blur was helpful",
  "Alerts fired while I was just thinking",
  "Looking down at notes counted as a distraction",
  "Reminders interrupted my concentration",
  "Fewer distractions, but not sure why",
  "Remember my usual session length",
] as const;

/**
 * Optional written comment (architecturedoc principle 4). Stored only for
 * users who share, read only by admins on /review, never sent to an AI model,
 * and deleted on withdrawal. Keep in sync with the check in
 * supabase/migrations/20261115000000_feedback_note.sql.
 */
export const FEEDBACK_NOTE_MAX_CHARS = 500;

// Obvious personal details: emails, links, phone-like numbers.
const personalDetail = /[\w.%+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\/|www\.|\+?\d[\d\s().-]{8,}\d/i;

export function noteHasPersonalDetails(note: string): boolean {
  return personalDetail.test(note);
}
