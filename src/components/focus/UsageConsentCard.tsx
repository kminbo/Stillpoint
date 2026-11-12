import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { UsageConsent } from "@/lib/usage-consent";

const DETAILS = [
  "Session length and how many times you looked away or tilted your head",
  "Which nudges you had on (blur, sound, notification) and your timer choice",
  "Your optional 1–5 rating and selected feedback topic after a session",
];

export function UsageConsentCard({ consent, onChange, busy = false, pending = false, message, onRetry }: {
  consent: UsageConsent;
  onChange: (v: "yes" | "no") => void;
  busy?: boolean;
  pending?: boolean;
  message?: string | null;
  onRetry?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const explainer = (
    <div className="mt-3 space-y-2 text-[12px] text-ink-soft">
      <p className="font-semibold text-ink">What is shared, if you say yes:</p>
      <ul className="list-disc space-y-1 pl-5">{DETAILS.map((d) => <li key={d}>{d}</li>)}</ul>
      <p><span className="font-semibold text-ink">Never collected:</span> camera video, pictures or face data. We do not attach your name or email. Reviews accept only fixed feedback topics, not personal details or written instructions. Your camera is processed on this computer only.</p>
      <p><span className="font-semibold text-ink">How it's used:</span> the private owner review page shows session insights and feedback topics. Only combined numbers and topic counts go to the AI service to suggest improvements. Other users cannot see your shared data.</p>
      <p><span className="font-semibold text-ink">Withdraw any time:</span> turn sharing off to stop collection and delete linked session statistics and feedback. Your focus history saved only on this browser stays here.</p>
      <p>A private deletion key is saved in this browser. Clearing browser storage or using another browser removes access to that key. Older statistics collected before deletion keys were introduced cannot be matched to you. Previously generated combined insights cannot be individually undone.</p>
    </div>
  );

  if (consent === null) {
    return (
      <div className="mt-6 rounded-[24px] glass-card p-5 rise-in">
        <p className="text-[14px] font-semibold text-ink">Help improve Stillpoint?</p>
        <p className="text-[12px] text-ink-soft">May Stillpoint save anonymous statistics about your sessions? Nothing is shared unless you say yes.</p>
        {explainer}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" disabled={busy || pending} className="rounded-full" onClick={() => onChange("yes")}>Yes, share anonymous stats</Button>
          <Button size="sm" disabled={busy} variant="outline" className="rounded-full" onClick={() => onChange("no")}>No thanks</Button>
        </div>
        {message && <p role="status" className="mt-3 text-[12px] text-ink-soft">{message}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl glass-card px-5 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-ink">Share anonymous stats to improve Stillpoint</p>
          <Button type="button" variant="link" className="h-auto whitespace-normal p-0 text-left text-[12px] text-ink-soft underline" onClick={() => setOpen(!open)}>
            {open ? "Hide details" : "What is collected and how it's used"}
          </Button>
        </div>
        <Switch disabled={busy || pending} checked={consent === "yes"} onCheckedChange={(c) => onChange(c ? "yes" : "no")} aria-label="Share anonymous stats" />
      </div>
      {open && explainer}
      <p className="mt-2 text-[12px] text-ink-soft">Switch off to withdraw consent and delete shared session statistics and feedback.</p>
      {busy && <p role="status" className="mt-2 text-[12px] text-ink-soft">Sharing is off. Deleting your shared data…</p>}
      {!busy && message && <p role="status" className="mt-2 text-[12px] text-ink-soft">{message}</p>}
      {pending && !busy && <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>Retry deletion</Button>}
    </div>
  );
}
