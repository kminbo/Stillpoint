import { z } from "zod";
import { FEEDBACK_OPTIONS } from "./feedback-options";
import { summarizeUsage, type UsageRow, type FeedbackRow } from "./usage-summary";

const number = z.number().finite().nonnegative();
const percent = number.max(100);
export const reviewInputSchema = z.object({
  summary: z.object({
    sessions: number.int(), avgMinutes: number, distractionsPer10Min: number,
    shortSessionsUnder2MinPct: percent, focusTrackerOnPct: percent, postureTrackerOnPct: percent,
    blurOnPct: percent, soundOnPct: percent, notificationOnPct: percent,
    timerChoices: z.record(z.string().refine((key) => key === "none" || (/^[0-9]{1,3}$/.test(key) && Number(key) >= 1 && Number(key) <= 600)), number.int()),
    timerCompletedPct: percent, reviews: number.int(), avgRating: z.number().min(1).max(5).nullable(),
  }).strict(),
  topics: z.array(z.object({ topic: z.enum(FEEDBACK_OPTIONS), count: number.int() }).strict()).max(FEEDBACK_OPTIONS.length),
}).strict();

export function buildReviewInput(sessions: UsageRow[], feedback: FeedbackRow[]) {
  return reviewInputSchema.parse({
    summary: summarizeUsage(sessions, feedback),
    topics: FEEDBACK_OPTIONS.filter(Boolean).map((topic) => ({ topic, count: feedback.filter((row) => row.comment === topic).length })),
  });
}

// Defense in depth, not a semantic-security guarantee. The model has no tools,
// user text, private rows, capabilities, credentials, or execution authority.
const unsafeOutput = /https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|ignore.{0,40}(instruction|rule)|\b(api.?key|password|secret.?key|access.?token|social.?security)\b|\b(upload|record|store|save|share|send|collect)\b.{0,60}\b(video|footage|webcam|face data|personal data|sensitive|other users)\b/i;
const safeText = z.string().trim().min(1).max(2000).refine((text) => !unsafeOutput.test(text), "Unsafe reviewer output");
export const reviewOutputSchema = z.object({
  summary: safeText,
  suggestions: z.array(z.object({ title: safeText.refine((text) => text.length <= 160), why: safeText, change: safeText, impact: z.enum(["high", "medium", "low"]) }).strict()).min(1).max(6),
}).strict();