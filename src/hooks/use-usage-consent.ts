import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { manageUsage } from "@/lib/usage.functions";
import {
  beginWithdrawal, completeWithdrawal, CONSENT_CHANGED_EVENT, consentToken,
  deletionPending, enableConsent, readConsent, saveConsent, type UsageConsent,
} from "@/lib/usage-consent";

export function useUsageConsent() {
  const [consent, setConsent] = useState<UsageConsent>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);
  const manage = useServerFn(manageUsage);
  const sync = useCallback(() => {
    setConsent(readConsent());
    setPending(deletionPending());
  }, []);
  const remove = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const token = beginWithdrawal();
      sync();
      if (token) await manage({ data: { token, action: "withdraw" } });
      completeWithdrawal(token);
      sync();
      setMessage(token ? "Sharing is off. Your linked session statistics and feedback have been deleted." : "Sharing is off. No linked shared data was found on this browser.");
    } catch (error) {
      sync();
      setMessage(error instanceof Error ? error.message : "Sharing is off, but deletion could not finish. Please retry.");
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }, [manage, sync]);
  useEffect(() => {
    sync();
    setLoaded(true);
    if (deletionPending()) void remove();
    const onStorage = () => sync();
    const onOnline = () => { if (deletionPending()) void remove(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CONSENT_CHANGED_EVENT, onStorage);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CONSENT_CHANGED_EVENT, onStorage);
      window.removeEventListener("online", onOnline);
    };
  }, [remove, sync]);
  const change = (value: "yes" | "no") => {
    if (value === "no" && (consentToken() || consent === "yes" || pending)) {
      void remove();
      return;
    }
    try {
      setMessage(null);
      if (value === "yes") enableConsent();
      else saveConsent("no");
      sync();
    } catch {
      setMessage("Your choice could not be saved. Allow browser storage and try again; sharing remains off.");
    }
  };
  return { consent, loaded, pending, busy, message, change, retry: remove };
}