import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FEEDBACK_OPTIONS } from "@/lib/feedback-options";
import { feedbackInputSchema } from "@/lib/usage-schema";
import { submitFeedback } from "@/lib/usage";

export function SessionReview({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "done") {
    return (
      <div className="mt-6 flex items-center justify-between rounded-2xl glass-card px-5 py-4 rise-in">
        <p className="text-[13px] text-ink">Thanks — your review helps improve Stillpoint.</p>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
    );
  }

  const send = async () => {
    const checked = feedbackInputSchema.safeParse({ session_id: sessionId, rating, comment });
    if (!checked.success) { setError("Choose a rating and an optional feedback topic."); return; }
    setState("sending");
    try {
      await submitFeedback(sessionId, rating, comment);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
      setState("error");
    }
  };

  return (
    <div className="mt-6 rounded-[24px] glass-card p-5 rise-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[14px] font-semibold text-ink">How focused did that session feel?</p>
          <p className="text-[12px] text-ink-soft">Optional — anonymous, and only your answer is sent.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Skip</Button>
      </div>
      <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <Button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            onClick={() => setRating(n)}
            className={`size-10 rounded-full text-[14px] font-semibold ring-1 transition ${
              rating >= n ? "bg-primary text-primary-foreground ring-primary" : "bg-card/60 text-ink ring-glass-border"
            }`}
          >
            {n}
          </Button>
        ))}
      </div>
      <Select value={comment || "none"} onValueChange={(value) => setComment(value === "none" ? "" : value)}>
        <SelectTrigger className="mt-3 bg-card/60" aria-label="Optional feedback topic"><SelectValue placeholder="Feedback topic (optional)" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No feedback topic</SelectItem>
          {FEEDBACK_OPTIONS.filter(Boolean).map((topic) => <SelectItem key={topic} value={topic}>{topic}</SelectItem>)}
        </SelectContent>
      </Select>
      {error && <p className="mt-2 text-[12px] text-destructive">{error}</p>}
      <Button onClick={send} disabled={rating === 0 || state === "sending"} className="mt-3 rounded-full">
        {state === "sending" ? "Sending…" : "Send review"}
      </Button>
    </div>
  );
}
