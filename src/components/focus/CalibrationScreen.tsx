import { CALIBRATION_SECONDS } from "@/hooks/use-focus-session";
import { WebcamFeed } from "./WebcamFeed";

interface CalibrationScreenProps {
  stream: MediaStream | null;
  countdown: number;
}

export function CalibrationScreen({ stream, countdown }: CalibrationScreenProps) {
  return (
    <main className="mt-10 rise-in">
      <section className="mx-auto grid max-w-[980px] grid-cols-1 items-center gap-7 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden rounded-[30px] glass-card p-3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-video-bed">
            <WebcamFeed
              stream={stream}
              className="absolute inset-0 size-full object-cover"
            />
            {/* Countdown overlay */}
            <div className="absolute inset-0 grid place-items-center bg-ink/25 backdrop-blur-[2px]">
              <div className="relative grid size-32 place-items-center">
                <div className="absolute inset-0 rounded-full border-2 border-primary-soft/70" />
                <div className="absolute -inset-5 rounded-full border border-primary-soft/30 pulse-ring" />
                <span className="font-display text-[64px] font-semibold leading-none text-white">
                  {countdown}
                </span>
              </div>
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-ink/60 px-3 py-1.5 text-[11px] font-medium text-primary-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-destructive blink" /> Live
            </div>
          </div>
        </div>

        <div className="px-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
            Calibration
          </p>
          <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.15] tracking-tight text-ink">
            Face the screen with your head straight
          </h2>
          <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-ink-soft">
            Get comfortable — head tracking begins in {CALIBRATION_SECONDS}{" "}
            seconds. You can change your sitting position during the session.
          </p>

          <div className="mt-7 flex items-center gap-4">
            <span className="font-display text-[15px] font-semibold text-ink">
              {countdown > 0 ? `${countdown}s` : "Done"}
            </span>
            <div className="flex flex-1 gap-1.5">
              {Array.from({ length: CALIBRATION_SECONDS }, (_, i) => {
                const filled = CALIBRATION_SECONDS - countdown > i;
                return (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                      filled ? "bg-primary" : "bg-primary/20"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="mt-7 flex items-center gap-2 rounded-2xl bg-card/60 p-4 ring-1 ring-glass-border">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/15">
              <div className="size-3 rounded-full bg-primary/70 ring-4 ring-primary/25" />
            </div>
            <p className="text-[12px] text-ink-soft">
              <span className="font-semibold text-ink">On-device only.</span> The camera feed
              never leaves this browser tab.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
