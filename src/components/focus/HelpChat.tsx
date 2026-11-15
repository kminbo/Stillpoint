import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircleQuestion, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askHelp } from "@/lib/help.functions";
import { HELP_MAX_TURNS, HELP_MAX_USER_CHARS, type HelpTurn } from "@/lib/help-chat";

const GREETING = "Hi! Ask me anything about Stillpoint: nudges, the timer, your stats or privacy.";

/** Help chatbot. The conversation lives only in memory and is never saved. */
export function HelpChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<HelpTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Block body on purpose: newer browsers return a Promise from scrollIntoView,
  // and an effect must return nothing or a cleanup function.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy, open]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    const next: HelpTurn[] = [...messages, { role: "user", text }];
    setMessages(next);
    setDraft("");
    setError(null);
    setBusy(true);
    try {
      // Send only the most recent turns, starting with a question.
      let recent = next.slice(-HELP_MAX_TURNS);
      while (recent[0]?.role !== "user") recent = recent.slice(1);
      const result = await askHelp({ data: { messages: recent } });
      if (result.ok) setMessages([...next, { role: "assistant", text: result.reply }]);
      else setError(result.error);
    } catch {
      setError("The help assistant is unavailable right now. Please try again later.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="fixed right-5 bottom-5 z-40 h-auto gap-2 rounded-full bg-ink px-4 py-3 text-[13px] font-semibold text-primary-foreground shadow-lg hover:bg-primary">
        <MessageCircleQuestion className="size-4" /> Ask Stillpoint
      </Button>
    );
  }

  return (
    <section aria-label="Stillpoint help chat" className="fixed right-4 bottom-4 z-40 flex max-h-[min(560px,calc(100dvh-2rem))] w-[min(380px,calc(100vw-2rem))] flex-col rounded-[24px] bg-card shadow-2xl ring-1 ring-glass-border">
      <header className="flex items-center justify-between gap-2 border-b border-glass-border px-4 py-3">
        <div>
          <p className="text-[14px] font-semibold text-ink">Ask Stillpoint</p>
          <p className="text-[11px] text-ink-soft">Answers questions about the app. It can't change your settings.</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close help chat" onClick={() => setOpen(false)}><X /></Button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-[13px]" aria-live="polite">
        <p className="max-w-[85%] rounded-2xl bg-primary/10 px-3 py-2 text-ink">{GREETING}</p>
        {messages.map((m, i) => (
          <p key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${m.role === "user" ? "ml-auto bg-ink text-primary-foreground" : "bg-primary/10 text-ink"}`}>
            {m.text}
          </p>
        ))}
        {busy && <p className="max-w-[85%] rounded-2xl bg-primary/10 px-3 py-2 text-ink-soft">Thinking…</p>}
        {error && <p role="status" className="rounded-2xl bg-destructive/10 px-3 py-2 text-destructive">{error}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="border-t border-glass-border px-4 py-3">
        <div className="flex gap-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={HELP_MAX_USER_CHARS} placeholder="Type your question" aria-label="Your question" disabled={busy} />
          <Button type="submit" size="icon" aria-label="Send" disabled={busy || !draft.trim()}><Send /></Button>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-ink-soft">
          Your questions go to Google Gemini only to get an answer. They are not saved, and this chat clears when you reload. Please don't include personal details.
        </p>
      </form>
    </section>
  );
}
