import { describe, expect, it } from "vitest";
import { reviewImpact, type ImpactSession } from "./impact-review";

const shipped = "2026-10-15T00:00:00Z";
const day = 86400000;
const mk = (offsetDays: number, distractions: number, seconds = 1500): ImpactSession => ({
  created_at: new Date(new Date(shipped).getTime() + offsetDays * day).toISOString(),
  seconds, distractions, timer_minutes: null, ended_by: "user",
});
const rate = (offsetDays: number, rating: number) => ({
  created_at: new Date(new Date(shipped).getTime() + offsetDays * day).toISOString(), rating,
});

describe("impact review of shipped changes", () => {
  it("waits for 5 sessions on each side before judging", () => {
    const s = [1, 2, 3, 4].map((d) => mk(-d, 5)).concat([1, 2, 3, 4, 5].map((d) => mk(d, 1)));
    expect(reviewImpact(shipped, s, []).verdict).toBe("too-early");
  });
  it("reports improvement when distractions fall and ratings rise", () => {
    const s = [1, 2, 3, 4, 5].map((d) => mk(-d, 6)).concat([1, 2, 3, 4, 5].map((d) => mk(d, 2)));
    const f = [rate(-1, 2), rate(1, 5)];
    expect(reviewImpact(shipped, s, f).verdict).toBe("improved");
  });
  it("reports worsening when distractions rise and ratings fall", () => {
    const s = [1, 2, 3, 4, 5].map((d) => mk(-d, 2)).concat([1, 2, 3, 4, 5].map((d) => mk(d, 6)));
    const f = [rate(-1, 5), rate(1, 2)];
    expect(reviewImpact(shipped, s, f).verdict).toBe("worsened");
  });
  it("ignores sessions older than 14 days before shipping", () => {
    const s = [20, 21, 22, 23, 24].map((d) => mk(-d, 6)).concat([1, 2, 3, 4, 5].map((d) => mk(d, 2)));
    expect(reviewImpact(shipped, s, []).beforeSessions).toBe(0);
  });
});
