import { manageUsage } from "./usage.functions";
import { consentToken, mayShareWithToken } from "./usage-consent";
import { feedbackInputSchema } from "./usage-schema";

export interface UsageInput {
  seconds: number;
  distractions: number;
  focus_tracking: boolean;
  posture_tracking: boolean;
  blur: boolean;
  sound: boolean;
  notification: boolean;
  timer_minutes: number | null;
  ended_by: "manual" | "timer";
}

/** Records anonymous session stats (no video, no identity). Returns the session id. */
export async function recordUsage(input: UsageInput): Promise<string | null> {
  const token = consentToken();
  if (!mayShareWithToken(token)) return null;
  try {
    const result = await manageUsage({ data: { token, action: "record", input } });
    return mayShareWithToken(token) ? result.id : null;
  } catch { return null; }
}

export async function submitFeedback(sessionId: string, rating: number, comment: string) {
  const token = consentToken();
  if (!mayShareWithToken(token)) throw new Error("Sharing is off. Your review was not sent.");
  const input = feedbackInputSchema.parse({ session_id: sessionId, rating, comment });
  await manageUsage({ data: { token, action: "feedback", input } });
}
