const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
// gemini-2.5-flash is retired for new keys (404). gemini-3.8-flash answered in
// ~2 minutes or 503 during testing. On 2026-11-21 gemini-3.5-flash took 18-45s
// while gemini-3.5-flash-lite answered in ~1s and passed all 15 help-chat cases.
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export class GatewayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface GeminiTurn {
  role: "user" | "model";
  text: string;
}

/**
 * One tool-free, JSON-only Gemini call. No tools are declared, so the model can
 * only return text. Never logs the request or the response.
 * Throws GatewayError with the HTTP status (0 = not configured).
 */
export async function generateGeminiJson(instructions: string, turns: GeminiTurn[]): Promise<string> {
  const apiKey = process.env["GEMINI_API_KEY"]?.trim();
  if (!apiKey) throw new GatewayError(0, "GEMINI_API_KEY is not set on the server.");
  const model = process.env["GEMINI_MODEL"]?.trim() || DEFAULT_MODEL;
  let status = 500;
  try {
    const response = await fetch(`${GEMINI_URL}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      // A hung request must not hold the server function open.
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions }] },
        contents: turns.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    status = response.status;
    if (!response.ok) throw new Error(`Gemini request failed (${status})`);
    const body = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = (body.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
    if (!text || text.length > 20000) throw new Error("Empty or oversized answer");
    return text;
  } catch {
    throw new GatewayError(status, "Gemini request failed.");
  }
}
