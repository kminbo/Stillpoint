import { useEffect, useRef } from "react";

interface WebcamFeedProps {
  stream: MediaStream | null;
  className?: string;
  mirrored?: boolean;
  /** Optional callback so parents can access the live <video> element (e.g. for pose tracking). */
  onElement?: (el: HTMLVideoElement | null) => void;
}

/**
 * Binds a MediaStream to a <video> element. The video element is what a
 * PoseEngine (MediaPipe) will sample frames from.
 */
export function WebcamFeed({ stream, className, mirrored = true, onElement }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stream) {
      video.srcObject = stream;
      void video.play().catch(() => {
        /* autoplay is allowed since the stream is muted */
      });
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  return (
    <video
      ref={(el) => {
        videoRef.current = el;
        onElement?.(el);
      }}
      className={className}
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
      autoPlay
      muted
      playsInline
    />
  );
}
