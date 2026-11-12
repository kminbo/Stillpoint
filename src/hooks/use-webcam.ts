import { useCallback, useEffect, useRef, useState } from "react";

export type WebcamStatus = "idle" | "requesting" | "ready" | "error";

/**
 * Encapsulates webcam access for the focus session.
 * The stream lives only for the duration of a session — callers must
 * call `release` when a session ends so the camera light turns off.
 */
export function useWebcam() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<WebcamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const request = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    setStatus("requesting");
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = media;
      setStream(media);
      setStatus("ready");
      return media;
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser and try again."
          : "We couldn't access your camera. Make sure it isn't in use by another app.",
      );
      return null;
    }
  }, []);

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return { stream, status, error, request, release };
}
