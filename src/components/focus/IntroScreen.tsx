import type { AlertPrefs } from "@/lib/alerts";
import { rate, type SessionRecord } from "@/lib/history";
import { CALIBRATION_SECONDS } from "@/hooks/use-focus-session";
import {
  SESSION_LENGTHS,
  type SessionMinutes,
} from "@/lib/session-settings";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface IntroScreenProps {
  onStart: () => void;
  requesting: boolean;
  error: string | null;
  lastSessionSeconds: number | null;
  alerts: AlertPrefs;
  onAlertsChange: (a: AlertPrefs) => void;
  notifHint?: string | null;
  history: SessionRecord[];
  sessionMinutes: SessionMinutes;
  onSessionMinutesChange: (minutes: SessionMinutes) => void;
}

const ALERT_OPTIONS: { key: keyof AlertPrefs; label: string; hint: string }[] = [
  { key: "blur", label: "Blur screen", hint: "Blurs this page" },
  { key: "sound", label: "Sound", hint: "Soft chime" },
  { key: "notification", label: "Notification", hint: "Works in other apps" },
];

function formatSummary(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function FocusStats({ history }: { history: SessionRecord[] }) {
  const last = history[history.length - 1];
  const prev = history.slice(-6, -1);
  const lastRate = last ? rate(last) : null;
  const prevAvg = prev.length ? prev.reduce((s, r) => s + rate(r), 0) / prev.length : null;
  let trend = "—";
  let trendLabel = "finish 2 sessions to compare";
  if (lastRate !== null && prevAvg !== null) {
    if (prevAvg === 0) {
      trend = lastRate === 0 ? "=" : "↑";
      trendLabel = lastRate === 0 ? "steady, no distractions" : "more distracted than before";
    } else {
      const pct = Math.round(((prevAvg - lastRate) / prevAvg) * 100);
      trend = pct >= 0 ? `↓${pct}%` : `↑${-pct}%`;
      trendLabel = pct >= 0 ? "fewer distractions than usual" : "more distractions than usual";
    }
  }
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-2xl bg-card/55 p-4 ring-1 ring-glass-border">
        <p className="font-display text-[22px] font-semibold text-ink">{last ? last.distractions : "—"}</p>
        <p className="mt-0.5 text-[11px] text-ink-soft">distractions last session</p>
      </div>
      <div className="rounded-2xl bg-card/55 p-4 ring-1 ring-glass-border">
        <p className="font-display text-[22px] font-semibold text-ink">
          {lastRate !== null ? lastRate.toFixed(1) : "—"}
        </p>
        <p className="mt-0.5 text-[11px] text-ink-soft">distractions per 10 min</p>
      </div>
      <div className="rounded-2xl bg-card/55 p-4 ring-1 ring-glass-border">
        <p className="font-display text-[22px] font-semibold text-ink">{trend}</p>
        <p className="mt-0.5 text-[11px] text-ink-soft">{trendLabel}</p>
      </div>
    </div>
  );
}

export function IntroScreen({ onStart, requesting, error, lastSessionSeconds, alerts, onAlertsChange, notifHint, history, sessionMinutes, onSessionMinutesChange }: IntroScreenProps) {
  return (
    <main className="mt-6 grid grid-cols-12 gap-7 rise-in">
      <section className="col-span-12 rounded-[34px] glass-card p-6 min-[840px]:col-span-7 min-[1100px]:p-8">
        <h1 className="font-display text-[36px] leading-[1.05] tracking-tight text-ink min-[1100px]:text-[44px]">
          Stillpoint - Stay in your <span className="text-primary">flow</span>.
        </h1>
        <p className="mt-3 max-w-[42ch] text-[15px] leading-relaxed text-ink-soft">
          Stillpoint tracks your head direction in real time and gently nudges you back into focus - make yourself more efficient.
        </p>

        <div className="mt-5 flex items-center gap-4 rounded-2xl bg-card/60 p-4 ring-1 ring-glass-border">
          <div className="grid size-12 place-items-center rounded-xl bg-primary/15">
            <div className="size-4 rounded-full bg-primary/70 ring-4 ring-primary/25" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink">Camera stays on-device</p>
            <p className="text-[12px] text-ink-soft">
              Used only for real-time head tracking. Never uploaded, never stored.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[12px] font-semibold text-ink">Choose your nudges</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ALERT_OPTIONS.map((o) => {
              const on = alerts[o.key];
              return (
                <div
                  key={String(o.key)}
                  className={`flex items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left ring-1 transition ${
                    on ? "bg-primary/15 ring-primary/40" : "bg-card/55 ring-glass-border"
                  }`}
                >
                  <span>
                    <span className="block text-[13px] font-semibold text-ink">{o.label}</span>
                    <span className="block text-[11px] text-ink-soft">{o.hint}</span>
                  </span>
                  <Switch
                    checked={on}
                    onCheckedChange={(checked) => onAlertsChange({ ...alerts, [o.key]: checked })}
                    aria-label={o.label}
                  />
                </div>
              );
            })}
          </div>
          {notifHint && (
            <p className="mt-2 rounded-2xl bg-warning/10 px-4 py-2.5 text-[12px] font-medium text-warning">
              {notifHint}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Button
            onClick={onStart}
            disabled={requesting}
            className="group h-auto rounded-full bg-ink px-7 py-4 text-[15px] font-semibold text-primary-foreground hover:bg-primary"
          >
            <span className="size-2.5 rounded-full bg-primary-soft group-hover:bg-primary-foreground" />
            {requesting ? "Requesting camera…" : "Start Focus Session"}
          </Button>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-ink-soft">
            <span>End after</span>
            <Select
              value={sessionMinutes === null ? "none" : String(sessionMinutes)}
              onValueChange={(value) => onSessionMinutesChange(value === "none" ? null : Number(value) as SessionMinutes)}
            >
              <SelectTrigger className="h-8 w-[108px] rounded-full border-glass-border bg-card/45 text-[11px] shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No timer</SelectItem>
                {SESSION_LENGTHS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>{minutes} minutes</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <p className="mt-5 rounded-2xl bg-destructive/10 px-4 py-3 text-[13px] font-medium text-destructive">
            {error}
          </p>
        )}

        {lastSessionSeconds !== null && !error && (
          <p className="mt-5 text-[13px] text-ink-soft">
            Last session: <span className="font-semibold text-ink">{formatSummary(lastSessionSeconds)}</span> of monitored focus.
          </p>
        )}

      </section>

      <aside className="col-span-12 hidden flex-col gap-5 min-[840px]:col-span-5 min-[840px]:flex">
        <div className="rounded-[30px] glass-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
              <span className="size-2 rounded-full bg-destructive blink" /> Calibrating
            </div>
            <span className="text-[11px] text-ink-soft">Face the screen with your head straight</span>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-video-bed ring-1 ring-glass-border">
            <div className="absolute inset-0 grid place-items-center">
              <div className="relative grid size-24 place-items-center">
                <div className="absolute inset-0 rounded-full border-2 border-primary/50" />
                <div className="absolute -inset-4 rounded-full border border-primary/25 pulse-ring" />
                <span className="font-display text-[34px] font-semibold text-ink">{CALIBRATION_SECONDS}</span>
              </div>
            </div>
            <div className="h-44" />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-ink-soft">
            <span>Countdown {CALIBRATION_SECONDS} → 1</span>
            <span>Face Landmarker · MediaPipe</span>
          </div>
        </div>

        <div className="rounded-[30px] glass-card p-5">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-soft">
            Focus tracking
          </p>
          <FocusStats history={history} />
        </div>
      </aside>
    </main>
  );
}
