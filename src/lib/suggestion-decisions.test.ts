import { describe, expect, it } from "vitest";
import { suggestionDecisionSchema } from "./suggestion-decisions";

const id = "14ac7210-f7b2-4b26-9d20-aac6c9035977";

describe("owner suggestion decisions", () => {
  it("allows accepting an improvement", () => {
    expect(suggestionDecisionSchema.parse({ id, status: "accepted" }).status).toBe("accepted");
  });
  it("allows declining an improvement", () => {
    expect(suggestionDecisionSchema.parse({ id, status: "declined" }).status).toBe("declined");
  });
  it("does not treat acceptance as automatic implementation", () => {
    expect(suggestionDecisionSchema.safeParse({ id, status: "implemented" }).success).toBe(false);
  });
});