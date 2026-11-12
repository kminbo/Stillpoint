import { beforeEach, describe, expect, it, vi } from "vitest";
import { beginWithdrawal, completeWithdrawal, consentToken, deletionPending, enableConsent, mayCollect, mayShareWithToken, readConsent } from "./usage-consent";

describe("usage data consent", () => {
  it("collects after the user says yes", () => expect(mayCollect("yes")).toBe(true));
  it("does not collect after the user says no", () => expect(mayCollect("no")).toBe(false));
  it("does not collect before the user has answered", () => expect(mayCollect(null)).toBe(false));
});

describe("consent withdrawal", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
      dispatchEvent: () => true,
    });
  });
  it("stops sharing immediately when consent is retracted", () => {
    enableConsent();
    const token = consentToken();
    expect(mayShareWithToken(token)).toBe(true);
    beginWithdrawal();
    expect(readConsent()).toBe("no");
    expect(mayShareWithToken(token)).toBe(false);
  });
  it("retains the deletion key and retry marker until deletion succeeds", () => {
    enableConsent();
    const token = beginWithdrawal();
    expect(consentToken()).toBe(token);
    expect(deletionPending()).toBe(true);
    expect(() => enableConsent()).toThrow();
    completeWithdrawal(token);
    expect(consentToken()).toBeNull();
    expect(deletionPending()).toBe(false);
  });
  it("uses a fresh key after consent is granted again", () => {
    enableConsent();
    const old = beginWithdrawal();
    completeWithdrawal(old);
    enableConsent();
    expect(consentToken()).not.toBe(old);
    expect(mayShareWithToken(old)).toBe(false);
  });
});
