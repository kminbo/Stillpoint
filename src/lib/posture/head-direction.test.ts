import { describe, expect, it } from "vitest";
import { classifyHeadDirection } from "./head-direction";

function head(pitch = 0, yaw = 0, roll = 0, scale = 1, position: [number, number, number] = [0, 0, 0]): number[] {
  const x = pitch * Math.PI / 180;
  const y = yaw * Math.PI / 180;
  const z = roll * Math.PI / 180;
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
  return [
    c * e * scale, (a * f + b * e * d) * scale, (b * f - a * e * d) * scale, 0,
    -c * f * scale, (a * e - b * f * d) * scale, (b * e + a * f * d) * scale, 0,
    d * scale, -b * c * scale, a * c * scale, 0,
    position[0], position[1], position[2], 1,
  ];
}
const both = { focus: true, posture: true };

describe("head-only tracking", () => {
  it("keeps a straight head focused after moving down in the frame", () => {
    const moved = head(0, 0, 0, 1, [10, -30, -60]);
    expect(classifyHeadDirection(moved, "head-tilted", both)).toBe("focused");
  });
  it("keeps a straight head focused after leaning nearer the camera", () => {
    const larger = head(0, 0, 0, 1.5);
    expect(classifyHeadDirection(larger, "away", both)).toBe("focused");
  });
  it("detects a turned head", () => {
    expect(classifyHeadDirection(head(0, 35), "focused", both)).toBe("away");
  });
  it("detects a downward head tilt", () => {
    expect(classifyHeadDirection(head(30), "focused", both)).toBe("head-tilted");
  });
  it("detects looking up as looking away", () => {
    expect(classifyHeadDirection(head(-22), "focused", both)).toBe("away");
  });
  it("keeps a slight upward glance focused", () => {
    expect(classifyHeadDirection(head(-10), "focused", both)).toBe("focused");
  });
  it("detects sideways head tilt", () => {
    const tilted = head(0, 0, 25);
    expect(classifyHeadDirection(tilted, "focused", both)).toBe("head-tilted");
  });
  it("does not let disabled focus tracking hide enabled head tilt", () => {
    expect(classifyHeadDirection(head(30, 35), "focused", { focus: false, posture: true })).toBe("head-tilted");
  });
  it("does not flag tilt when head tilt tracking is off", () => {
    expect(classifyHeadDirection(head(30), "focused", { focus: true, posture: false })).toBe("focused");
  });
  it("only flags a missing face when focus tracking is enabled", () => {
    expect(classifyHeadDirection(undefined, "focused", both)).toBe("away");
    expect(classifyHeadDirection(undefined, "focused", { focus: false, posture: true })).toBe("focused");
  });
  it("preserves head rotation classification regardless of body position and distance", () => {
    expect(classifyHeadDirection(head(30, 0, 0, 2, [40, 80, -120]), "focused", both)).toBe("head-tilted");
    expect(classifyHeadDirection(head(0, -35, 0, 0.5, [-40, -80, -30]), "focused", both)).toBe("away");
  });
  it("clears an interruption when the head straightens in a new seating position", () => {
    expect(classifyHeadDirection(head(5, 5, 5, 0.8, [50, -40, -80]), "head-tilted", both)).toBe("focused");
  });
});