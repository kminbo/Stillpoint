import { createFileRoute } from "@tanstack/react-router";
import { useWebcam } from "@/hooks/use-webcam";
import { useFocusSession } from "@/hooks/use-focus-session";
import { IntroScreen } from "@/components/focus/IntroScreen";
import { CalibrationScreen } from "@/components/focus/CalibrationScreen";
import { SessionScreen } from "@/components/focus/SessionScreen";
import { useCallback, useEffect, useRef, useState } from "react";
import { defaultAlertPrefs, requestNotificationPermission, showNotification, unlockAudio, type AlertPrefs } from "@/lib/alerts";
import { clearHistory, loadHistory, saveSession, type SessionRecord } from "@/lib/history";
import { StillpointMenu } from "@/components/focus/StillpointMenu";
import { recordUsage } from "@/lib/usage";
import { SessionReview } from "@/components/focus/SessionReview";
import { UsageConsentCard } from "@/components/focus/UsageConsentCard";
import { mayCollect, readConsent } from "@/lib/usage-consent";
import { useUsageConsent } from "@/hooks/use-usage-consent";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  trackingPrefs,
  type SessionMinutes,
} from "@/lib/session-settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stillpoint — Head-aware Focus" },
      {
        name: "description",
        content:
          "Stay focused while you work. Stillpoint tracks your head direction and tilt locally through your webcam, with optional session statistics to help improve the product. Camera footage is never uploaded.",
      },
      { property: "og:title", content: "Stillpoint — Head-aware Focus" },
      {
        property: "og:description",
        content:
          "Real-time head tracking for deep work. Camera stays on-device — no frames, no recordings, ever.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FocusApp,
});

const BLOCKED_HINT =
  "Notifications are blocked. Allow them for this site in your browser's settings. On a Mac, also open System Settings → Notifications, pick Google Chrome or Safari, and turn on Allow Notifications. Then switch this on again.";

function FocusApp() {
  const { stream, status, error, request, release } = useWebcam();
  const { phase, countdown, elapsed, lastSessionSeconds, beginCalibration, endSession } =
    useFocusSession();

  const [alerts, setAlerts] = useState<AlertPrefs>(defaultAlertPrefs);
  const [notifHint, setNotifHint] = useState<string | null>(null);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [distractions, setDistractions] = useState(0);
  const [sessionMinutes, setSessionMinutes] = useState<SessionMinutes>(null);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const privacy = useUsageConsent();
  const { consent, loaded: consentLoaded } = privacy;
  const [privacyOpen, setPrivacyOpen] = useState(false);
  useEffect(() => {
    if (consent !== "yes") setReviewSessionId(null);
  }, [consent]);
  const startRef = useRef<number | null>(null);
  useEffect(() => setHistory(loadHistory()), []);
  const handleDistraction = useCallback(() => setDistractions((n) => n + 1), []);

  useEffect(() => {
    if (phase === "session") {
      startRef.current = Date.now();
      setDistractions(0);
    }
  }, [phase]);

  const handleAlertsChange = async (next: AlertPrefs) => {
    if (next.notification && !alerts.notification) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        setAlerts({ ...next, notification: false });
        setNotifHint(BLOCKED_HINT);
        return;
      }
      setNotifHint(null);
      showNotification("Stillpoint", "Notifications are on. You'll be nudged when you drift.");
    }
    setAlerts(next);
  };

  const handleStart = async () => {
    if (alerts.sound) unlockAudio();
    if (alerts.notification) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        setAlerts((a) => ({ ...a, notification: false }));
        setNotifHint(BLOCKED_HINT);
      }
    }
    const media = await request();
    if (media) beginCalibration();
  };

  const handleEnd = useCallback((endedBy: "manual" | "timer" = "manual") => {
    if (startRef.current !== null) {
      const seconds = Math.max(1, Math.floor((Date.now() - startRef.current) / 1000));
      setHistory(saveSession({ date: Date.now(), seconds, distractions }));
      startRef.current = null;
      if (mayCollect(readConsent())) void recordUsage({
        seconds,
        distractions,
        focus_tracking: trackingPrefs.focus,
        posture_tracking: trackingPrefs.posture,
        blur: alerts.blur,
        sound: alerts.sound,
        notification: alerts.notification,
        timer_minutes: sessionMinutes,
        ended_by: endedBy,
      }).then((id) => setReviewSessionId(id));
    }
    endSession();
    release();
  }, [distractions, endSession, release, alerts, sessionMinutes]);

  const sessionLimitSeconds = sessionMinutes === null ? null : sessionMinutes * 60;
  const remainingSeconds = sessionLimitSeconds === null ? null : Math.max(0, sessionLimitSeconds - elapsed);

  useEffect(() => {
    if (phase === "session" && sessionLimitSeconds !== null && elapsed >= sessionLimitSeconds) {
      handleEnd("timer");
    }
  }, [elapsed, handleEnd, phase, sessionLimitSeconds]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-ink">
      {/* Ambient background */}
      <div className="absolute -top-40 -left-32 size-[36rem] rounded-full bg-primary/25 blur-3xl drift" />
      <div className="absolute top-1/3 -right-40 size-[34rem] rounded-full bg-sky-300/30 blur-3xl floaty" />
      <div className="absolute -bottom-40 left-1/3 size-[30rem] rounded-full bg-destructive/15 blur-3xl floaty2" />
      <div className="absolute top-16 left-1/2 size-[24rem] rounded-full bg-card/60 blur-3xl" />

      <div className="relative mx-auto max-w-[1180px] px-6 pt-7 pb-16">
        <header className="flex items-center justify-between">
          <StillpointMenu
            onPrivacy={() => setPrivacyOpen(true)}
            onDeleteHistory={() => { clearHistory(); setHistory([]); }}
            onDeleteShared={privacy.retry}
            deletionBusy={privacy.busy}
            deletionPending={privacy.pending}
            deletionMessage={privacy.message}
            alerts={alerts}
            onAlertsChange={handleAlertsChange}
            notifHint={notifHint}
            sessionMinutes={sessionMinutes}
            onSessionMinutesChange={setSessionMinutes}
            sessionActive={phase !== "intro"}
          />

          <div className="flex items-center gap-2 rounded-full bg-card/60 px-3 py-1.5 text-xs font-medium text-ink-soft ring-1 ring-glass-border backdrop-blur-xl">
            <span className="size-1.5 rounded-full bg-primary blink" /> Camera on-device
          </div>
        </header>

        {phase === "intro" && reviewSessionId && consent === "yes" && (
          <SessionReview key={reviewSessionId} sessionId={reviewSessionId} onClose={() => setReviewSessionId(null)} />
        )}
        {phase === "intro" && consentLoaded && (
          <UsageConsentCard consent={consent} onChange={privacy.change} busy={privacy.busy} pending={privacy.pending} message={privacy.message} onRetry={privacy.retry} />
        )}
        {phase === "intro" && (
          <IntroScreen
            onStart={handleStart}
            requesting={status === "requesting"}
            error={error}
            lastSessionSeconds={lastSessionSeconds}
            alerts={alerts}
            onAlertsChange={handleAlertsChange}
            notifHint={notifHint}
            history={history}
            sessionMinutes={sessionMinutes}
            onSessionMinutesChange={setSessionMinutes}
          />
        )}
        {phase === "calibrating" && <CalibrationScreen stream={stream} countdown={countdown} />}
        {phase === "session" && <SessionScreen stream={stream} elapsed={elapsed} onEnd={() => handleEnd("manual")} alerts={alerts} distractions={distractions} onDistraction={handleDistraction} tracking={trackingPrefs} remainingSeconds={remainingSeconds} />}

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
          <span>Stillpoint · see your focus improve over time</span>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs text-ink-soft" onClick={() => setPrivacyOpen(true)}>Privacy & data</Button>
          <span>Camera used only for real-time head tracking</span>
        </footer>
        <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
          <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto">
            <DialogTitle>Privacy & data</DialogTitle>
            <DialogDescription>Choose whether to share session data with Stillpoint.</DialogDescription>
            {consentLoaded && <UsageConsentCard consent={consent} onChange={privacy.change} busy={privacy.busy} pending={privacy.pending} message={privacy.message} onRetry={privacy.retry} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
