import { beforeEach, expect, it, vi } from "vitest";
import { loadProfileName, saveProfileName } from "./profile";
import { clearHistory, loadHistory, saveSession } from "./history";

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
});

it("saves a non-personal profile label on this browser", () => {
  saveProfileName("Focus explorer");
  expect(loadProfileName()).toBe("Focus explorer");
});

it("rejects sensitive text as a profile label and removes legacy free text", () => {
  expect(() => saveProfileName("My password is secret")).toThrow();
  localStorage.setItem("stillpoint-profile-name", "private@example.test");
  expect(loadProfileName()).toBe("");
  expect(localStorage.getItem("stillpoint-profile-name")).toBeNull();
});

it("deletes local history without removing the pending shared-data deletion key", () => {
  localStorage.setItem("stillpoint-usage-token", "retained-key");
  localStorage.setItem("stillpoint-usage-deletion-pending", "yes");
  saveSession({ date: 1, seconds: 60, distractions: 2 });
  clearHistory();
  expect(loadHistory()).toEqual([]);
  expect(localStorage.getItem("stillpoint-usage-token")).toBe("retained-key");
  expect(localStorage.getItem("stillpoint-usage-deletion-pending")).toBe("yes");
});