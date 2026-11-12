import { describe, expect, it } from "vitest";
import { consentActionSchema } from "./usage-schema";

describe("consent request ownership", () => {
  it("requires a 256-bit deletion key rather than a session ID", () => {
    expect(consentActionSchema.safeParse({ action: "withdraw", token: "123" }).success).toBe(false);
    expect(consentActionSchema.safeParse({ action: "withdraw", token: "a".repeat(64) }).success).toBe(true);
  });
  it("rejects feedback outside the optional 1–5 rating range", () => {
    const request = { action: "feedback", token: "a".repeat(64), input: { session_id: "123e4567-e89b-42d3-a456-426614174000", rating: 6, comment: "" } };
    expect(consentActionSchema.safeParse(request).success).toBe(false);
    expect(consentActionSchema.safeParse({ ...request, input: { ...request.input, rating: 5 } }).success).toBe(true);
  });
});