import { useCallback, useEffect, useRef, useState } from "react";
import { playChime, showNotification, type AlertPrefs } from "@/lib/alerts";
import { formatDuration } from "@/hooks/use-focus-session";
import { PostureMonitor } from "@/components/posture/PostureMonitor";
import { WebcamFeed } from "./WebcamFeed";
import type { AttentionState } from "@/lib/posture/attention-engine";
import type { TrackingPrefs } from "@/lib/session-settings";
import { Button } from "@/components/ui/button";

interface SessionScreenProps {
  stream: MediaStream | null;
  elapsed: number;
  onEnd: () => void;
  alerts: AlertPrefs;
  distractions: number;
  onDistraction: () => void;
  tracking: TrackingPrefs;
  remainingSeconds: number | null;
}

export function SessionScreen({ stream, elapsed, onEnd, alerts, distractions, onDistraction, tracking, remainingSeconds }: SessionScreenProps) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [attention, setAttention] = useState<AttentionState>("loading");
  const handleAttentionChange = useCallback((state: AttentionState) => setAttention(state), []);
  const isAway = attention === "away";
  const isHeadTilted = attention === "head-tilted";
  const detected = (tracking.focus && isAway) || (tracking.posture && isHeadTilted);
  const isInterrupted = alerts.blur && detected;
  const monitoringLabel = tracking.focus && tracking.posture
    ? "Monitoring head direction and tilt"
    : tracking.focus
      ? "Monitoring head direction"
      : tracking.posture
        ? "Monitoring head tilt"
        : "Timer only";

  const prevRef = useRef<AttentionState>("loading");
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = attention;
    if (attention === prev || (attention !== "away" && attention !== "head-tilted")) return;
    if ((attention === "away" && !tracking.focus) || (attention === "head-tilted" && !tracking.posture)) return;
    // Count a new distraction only when coming from a focused state.
    if (prev !== "away" && prev !== "head-tilted") onDistraction();
    if (alerts.sound) playChime();
    if (alerts.notification) {
      showNotification(
        "Stillpoint",
        attention === "away" ? "You looked away — come back to your focus." : "Straighten your head to stay focused.",
      );
    }
  }, [attention, alerts.sound, alerts.notification, onDistraction, tracking.focus, tracking.posture]);

  return (
    <main className="relative mt-10 rise-in" aria-live="polite">
      {/* Track only head direction and tilt against the live video. */}
      <PostureMonitor video={videoEl} active tracking={tracking} onAttentionChange={handleAttentionChange} />

      <div
        className={`mx-auto grid max-w-[980px] grid-cols-1 items-stretch gap-7 transition-[filter,opacity] duration-500 lg:grid-cols-[1.1fr_0.9fr] ${
          isInterrupted ? "pointer-events-none blur-xl opacity-50" : "blur-none opacity-100"
        }`}
        aria-hidden={isInterrupted}
      >
        <section className="rounded-[30px] glass-card p-3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-video-bed">
            <WebcamFeed
              stream={stream}
              className="absolute inset-0 size-full object-cover"
              onElement={setVideoEl}
            />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-ink/60 px-3 py-1.5 text-[11px] font-medium text-primary-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-primary blink" />
               {monitoringLabel}
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-ink/60 px-3 py-1.5 text-[11px] font-medium text-primary-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-destructive blink" /> Live
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-[30px] glass-card p-8">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-soft">
              {remainingSeconds === null ? "Time in focus" : "Time remaining"}
            </p>
            <div className="mt-2 font-display text-[76px] font-semibold leading-none tracking-tight text-ink tabular-nums">
              {formatDuration(remainingSeconds ?? elapsed)}
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary">
              <span className="size-2 rounded-full bg-primary blink" />
              {monitoringLabel}
            </div>
            <div className="mt-5 rounded-2xl bg-card/55 p-4 ring-1 ring-glass-border">
              <p className="font-display text-[32px] font-semibold leading-none text-ink tabular-nums">
                {distractions}
              </p>
              <p className="mt-1 text-[12px] text-ink-soft">
                {distractions === 1 ? "distraction" : "distractions"} this session
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Button
              onClick={onEnd}
              className="h-auto rounded-full bg-ink px-7 py-4 text-[15px] font-semibold text-primary-foreground hover:bg-destructive"
            >
              <span className="size-2.5 rounded-full bg-primary-soft" />
              End session
            </Button>
          </div>
        </section>
      </div>

      {isInterrupted && (
        <div className="absolute inset-0 z-20 grid place-items-center">
          <div className="mx-6 max-w-sm rounded-[30px] glass-card px-8 py-7 text-center shadow-2xl">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-warning/15">
              <span className="size-3 rounded-full bg-warning blink" />
            </div>
            <p className="font-display text-2xl font-semibold text-ink">
              {isAway ? "Look back to continue" : "Straighten your head to continue"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {isAway
                ? "Your focus screen will clear when you face it again."
                : "The screen clears when your head is straight again, wherever you are sitting."}
            </p>
            <Button variant="outline" className="mt-5 rounded-full" onClick={onEnd}>End session</Button>
          </div>
        </div>
      )}
    </main>
  );
}
