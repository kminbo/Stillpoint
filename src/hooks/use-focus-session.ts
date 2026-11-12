import { useCallback, useEffect, useRef, useState } from "react";

export type SessionPhase = "intro" | "calibrating" | "session";

export const CALIBRATION_SECONDS = 3;

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * State machine for the focus session flow:
 * intro → (start) → calibrating (3s countdown) → session → (end) → intro.
 */
export function useFocusSession() {
  const [phase, setPhase] = useState<SessionPhase>("intro");
  const [countdown, setCountdown] = useState(CALIBRATION_SECONDS);
  const [elapsed, setElapsed] = useState(0);
  const [lastSessionSeconds, setLastSessionSeconds] = useState<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const beginCalibration = useCallback(() => {
    setCountdown(CALIBRATION_SECONDS);
    setElapsed(0);
    setPhase("calibrating");
  }, []);

  // Calibration countdown: 3 → 1, then hand over to the live session.
  useEffect(() => {
    if (phase !== "calibrating") return;
    if (countdown <= 0) {
      startedAtRef.current = Date.now();
      setPhase("session");
      return;
    }
    const id = window.setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [phase, countdown]);

  // Session timer.
  useEffect(() => {
    if (phase !== "session") return;
    const id = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const endSession = useCallback(() => {
    if (startedAtRef.current !== null) {
      setLastSessionSeconds(Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000)));
    }
    startedAtRef.current = null;
    setPhase("intro");
  }, []);

  return {
    phase,
    countdown,
    elapsed,
    lastSessionSeconds,
    beginCalibration,
    endSession,
  };
}
