import { z } from "zod";
import { FEEDBACK_OPTIONS } from "./feedback-options";

export const consentTokenSchema = z.string().regex(/^[0-9a-f]{64}$/);
export const usageInputSchema = z.object({
  seconds: z.number().int().min(1).max(86400),
  distractions: z.number().int().min(0).max(10000),
  focus_tracking: z.boolean(),
  posture_tracking: z.boolean(),
  blur: z.boolean(),
  sound: z.boolean(),
  notification: z.boolean(),
  timer_minutes: z.number().int().min(1).max(600).nullable(),
  ended_by: z.enum(["manual", "timer"]),
}).strict();
export const feedbackInputSchema = z.object({
  session_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.enum(FEEDBACK_OPTIONS, { errorMap: () => ({ message: "Choose a feedback topic; personal information and custom instructions are not accepted." }) }),
}).strict();
export const consentActionSchema = z.discriminatedUnion("action", [
  z.object({ token: consentTokenSchema, action: z.literal("record"), input: usageInputSchema }).strict(),
  z.object({ token: consentTokenSchema, action: z.literal("feedback"), input: feedbackInputSchema }).strict(),
  z.object({ token: consentTokenSchema, action: z.literal("withdraw") }).strict(),
]);