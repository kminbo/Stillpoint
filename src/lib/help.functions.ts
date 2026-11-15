import { createServerFn } from "@tanstack/react-start";
import { helpChatInputSchema } from "./help-chat";

/** Public help chat. Messages are forwarded to Gemini only; nothing is stored or logged. */
export const askHelp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const checked = helpChatInputSchema.safeParse(input);
    // Generic message: never echo user text back into errors or logs.
    if (!checked.success) throw new Error("Please ask a question of up to 500 characters.");
    return checked.data;
  })
  .handler(async ({ data }) => {
    const { runHelpAgent, GatewayError } = await import("@/lib/ai/help-agent.server");
    try {
      return { ok: true as const, reply: await runHelpAgent(data) };
    } catch (e) {
      return { ok: false as const, error: e instanceof GatewayError ? e.message : "The help assistant is unavailable right now." };
    }
  });
