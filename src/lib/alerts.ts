export interface AlertPrefs {
  blur: boolean;
  sound: boolean;
  notification: boolean;
}

export const defaultAlertPrefs: AlertPrefs = { blur: true, sound: false, notification: false };

let ctx: AudioContext | null = null;

/** Soft two-tone chime generated on the fly (no audio file needed). */
export function playChime() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch {
    /* ignore */
  }
}

/** Call from a user click so browsers allow audio later. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
  } catch {
    /* ignore */
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  // Older Safari only supports the callback form.
  const result = await new Promise<NotificationPermission>((resolve) => {
    const maybe = Notification.requestPermission((p) => resolve(p));
    if (maybe && typeof maybe.then === "function") maybe.then(resolve, () => resolve("denied"));
  });
  return result === "granted";
}

let counter = 0;

export function showNotification(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    // macOS (Chrome + Safari) silently replaces notifications that reuse a tag
    // and may hide "silent" ones, so use a fresh tag and default sound.
    counter += 1;
    const n = new Notification(title, { body, tag: `stillpoint-${Date.now()}-${counter}` });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    window.setTimeout(() => n.close(), 6000);
  } catch {
    /* ignore */
  }
}
