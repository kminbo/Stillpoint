import { useEffect } from "react";
import { createAttentionEngine, type AttentionState } from "@/lib/posture/attention-engine";
import type { TrackingPrefs } from "@/lib/session-settings";

interface PostureMonitorProps {
  video: HTMLVideoElement | null;
  active: boolean;
  tracking: TrackingPrefs;
  onAttentionChange?: (state: AttentionState) => void;
}

/** Owns the on-device head tracking lifecycle; no body-pose engine runs. */
export function PostureMonitor({ video, active, tracking, onAttentionChange }: PostureMonitorProps) {
  useEffect(() => {
    if (!active || !video || (!tracking.focus && !tracking.posture)) return;
    let cancelled = false;
    const engine = createAttentionEngine(video, { focus: tracking.focus, posture: tracking.posture });
    const unsubscribe = engine.onState((state) => onAttentionChange?.(state));
    void engine.init().then(() => {
      if (!cancelled) engine.start();
    });
    return () => {
      cancelled = true;
      unsubscribe();
      engine.stop();
      onAttentionChange?.("loading");
    };
  }, [active, onAttentionChange, video, tracking.focus, tracking.posture]);
  return null;
}
