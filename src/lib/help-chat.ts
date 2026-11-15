import { z } from "zod";

/**
 * Help chat contract. Chat text is the one kind of user-typed text allowed to
 * reach an AI model (architecturedoc principle 4): it is sent to Gemini only to
 * answer, never stored or logged, and never linked to usage data.
 */
export const HELP_MAX_USER_CHARS = 500;
export const HELP_MAX_REPLY_CHARS = 1500;
/** Earlier turns sent for context, including the newest question. */
export const HELP_MAX_TURNS = 8;

const turn = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(HELP_MAX_REPLY_CHARS),
}).strict();

export const helpChatInputSchema = z.object({
  messages: z.array(turn).min(1).max(HELP_MAX_TURNS),
}).strict().refine(
  ({ messages }) => messages[0]?.role === "user" && messages[messages.length - 1]?.role === "user" &&
    messages.every((m) => m.role !== "user" || m.text.length <= HELP_MAX_USER_CHARS),
  "The last message must be a question of at most 500 characters.",
);

export type HelpChatInput = z.infer<typeof helpChatInputSchema>;
export type HelpTurn = HelpChatInput["messages"][number];

// Defense in depth: a help answer never needs links, contact details, phone
// numbers, credentials or code. Refusals ("I can't record your webcam") must
// still pass, so this does not reject privacy words the way the reviewer check does.
const unsafeReply = /https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d\s().-]{8,}\d|\b(api.?key|password|secret.?key|access.?token|bearer)\b|```|<script/i;

export const helpReplySchema = z.object({
  reply: z.string().trim().min(1).max(HELP_MAX_REPLY_CHARS).refine((text) => !unsafeReply.test(text), "Unsafe help reply"),
}).strict();

export const HELP_FALLBACK = "Sorry, I can't answer that right now. You can change nudges and the timer on the front page, and sharing under Privacy & data.";
