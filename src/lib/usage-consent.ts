export type UsageConsent = "yes" | "no" | null;
const KEY = "stillpoint-usage-consent";
const TOKEN_KEY = "stillpoint-usage-token";
const PENDING_KEY = "stillpoint-usage-deletion-pending";
export const CONSENT_CHANGED_EVENT = "stillpoint-consent-changed";

export function readConsent(): UsageConsent {
  if (typeof window === "undefined") return null;
  try {
    if (deletionPending()) return "no";
    const v = window.localStorage.getItem(KEY);
    return v === "yes" || v === "no" ? v : null;
  } catch { return null; }
}

export function saveConsent(v: "yes" | "no") {
  window.localStorage.setItem(KEY, v);
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

export function consentToken(): string | null {
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function deletionPending(): boolean {
  try { return window.localStorage.getItem(PENDING_KEY) === "yes"; } catch { return false; }
}

export function enableConsent() {
  if (deletionPending()) throw new Error("Please finish deleting your previous data before sharing again.");
  if (!consentToken()) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    window.localStorage.setItem(TOKEN_KEY, Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));
  }
  saveConsent("yes");
}

export function beginWithdrawal(): string | null {
  // Store the retry marker before switching consent off, and retain the secret until deletion succeeds.
  const token = consentToken();
  window.localStorage.setItem(PENDING_KEY, "yes");
  saveConsent("no");
  return token;
}

export function completeWithdrawal(token: string | null) {
  if (consentToken() !== token) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(PENDING_KEY);
  saveConsent("no");
}

export function mayShareWithToken(token: string | null): token is string {
  return token !== null && mayCollect(readConsent()) && consentToken() === token;
}

/** Usage stats are only sent after an explicit yes; no answer means no. */
export const mayCollect = (c: UsageConsent) => c === "yes";
