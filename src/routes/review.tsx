import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getUsageOverview, generateSuggestions, decideSuggestion, markImplemented, getImpactReviews } from "@/lib/review.functions";
import { MIN_SESSIONS_PER_SIDE, WINDOW_DAYS, type ImpactReview } from "@/lib/impact-review";
import { Check, X, Undo2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review agent — Stillpoint" },
      { name: "description", content: "Private owner page: anonymous usage insights and AI product suggestions for Stillpoint." },
      { property: "og:title", content: "Review agent — Stillpoint" },
      { property: "og:description", content: "Usage insights and AI suggestions to improve Stillpoint." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background px-6 py-10 text-ink">
      <div className="mx-auto max-w-[900px]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-[34px] font-semibold tracking-tight">Review agent</h1>
            <p className="text-[13px] text-ink-soft">Anonymous usage + optional reviews → suggestions to improve Stillpoint.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-[13px] text-ink-soft hover:text-ink">Back to app</Link>
            {session && <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>Sign out</Button>}
          </div>
        </div>
        {!ready ? null : session ? <Dashboard /> : <SignIn />}
      </div>
    </div>
  );
}

function SignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/review` } });
    setBusy(false);
    if (res.error) setMsg(res.error.message);
    else if (mode === "up" && !res.data.session) setMsg("Check your email to confirm your account, then sign in.");
  };

  return (
    <form onSubmit={submit} className="mt-8 max-w-sm space-y-3 rounded-[24px] glass-card p-6">
      <p className="text-[14px] font-semibold">{mode === "in" ? "Owner sign in" : "Create account"}</p>
      <p className="text-[12px] text-ink-soft">Review access is granted separately by the project owner. Creating an account does not grant access to user insights.</p>
      <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {msg && <p className="text-[12px] text-ink-soft">{msg}</p>}
      <Button type="submit" disabled={busy} className="w-full rounded-full">{mode === "in" ? "Sign in" : "Create account"}</Button>
      <button type="button" className="text-[12px] text-ink-soft underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "First time? Create an account" : "Have an account? Sign in"}
      </button>
    </form>
  );
}

type Overview = Awaited<ReturnType<typeof getUsageOverview>>;
type SavedSuggestion = Overview["suggestions"][number];

function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "accepted" | "declined">("pending");
  const [saving, setSaving] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const [impact, setImpact] = useState<Record<string, ImpactReview>>({});
  const loadImpact = () => getImpactReviews().then(setImpact).catch(() => {});

  useEffect(() => {
    getUsageOverview().then(setOverview).catch((e) => setError(e instanceof Error ? e.message : "Could not load data."));
    loadImpact();
  }, []);

  const ship = async (id: string, implemented: boolean) => {
    setSaving(id);
    setError(null);
    try {
      const saved = await markImplemented({ data: { id, implemented } });
      setOverview((c) => c ? { ...c, suggestions: c.suggestions.map((x) => x.id === saved.id ? saved : x) } : c);
      await loadImpact();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(null);
    }
  };

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await generateSuggestions();
      if (r.ok) {
        setOverview(await getUsageOverview());
        setFilter("pending");
      }
      else setError(r.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The review agent failed.");
    } finally {
      setRunning(false);
    }
  };

  const decide = async (id: string, status: "pending" | "accepted" | "declined") => {
    setSaving(id);
    setError(null);
    try {
      const saved = await decideSuggestion({ data: { id, status } });
      setOverview((current) => current ? { ...current, suggestions: current.suggestions.map((item) => item.id === saved.id ? saved : item) } : current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your decision.");
    } finally {
      setSaving(null);
    }
  };

  const copy = async (i: number, s: SavedSuggestion) => {
    await navigator.clipboard.writeText(`Please implement this Stillpoint improvement: ${s.title}. ${s.change}`);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  };

  if (error && !overview) return <p className="mt-8 rounded-2xl bg-destructive/10 p-4 text-[13px] text-destructive">{error}</p>;
  if (!overview) return <p className="mt-8 text-[13px] text-ink-soft">Loading usage…</p>;
  const s = overview.summary;
  const stats: [string, string][] = [
    ["Sessions", String(s.sessions)],
    ["Avg length", `${s.avgMinutes} min`],
    ["Distractions / 10 min", String(s.distractionsPer10Min)],
    ["Avg rating", s.avgRating === null ? "—" : `${s.avgRating} / 5`],
    ["Focus tracker on", `${s.focusTrackerOnPct}%`],
    ["Head tilt tracker on", `${s.postureTrackerOnPct}%`],
    ["Notifications on", `${s.notificationOnPct}%`],
    ["Timer finished", `${s.timerCompletedPct}%`],
  ];

  return (
    <div className="mt-8 space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl glass-card p-4">
            <p className="font-display text-[22px] font-semibold">{value}</p>
            <p className="text-[11px] text-ink-soft">{label}</p>
          </div>
        ))}
      </div>

      {overview.comments.length > 0 && (
        <div className="rounded-[24px] glass-card p-5">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Recent reviews</p>
          <ul className="space-y-2">
            {overview.comments.map((c, i) => (
              <li key={i} className="text-[13px]"><span className="font-semibold">{c.rating}/5</span> — {c.comment}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-[24px] glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold">Suggestions</p>
            <p className="text-[12px] text-ink-soft">Accepting saves your choice; changes are not applied automatically.</p>
          </div>
          <Button onClick={run} disabled={running} className="rounded-full">
            {running ? "Analyzing…" : "Get suggestions"}
          </Button>
        </div>
        {error && <p className="mt-3 rounded-2xl bg-destructive/10 p-3 text-[13px] text-destructive">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Suggestion status">
          {(["pending", "accepted", "declined"] as const).map((status) => (
            <Button key={status} size="sm" variant={filter === status ? "default" : "outline"} onClick={() => setFilter(status)} aria-pressed={filter === status}>
              {status.charAt(0).toUpperCase() + status.slice(1)} ({overview.suggestions.filter((item) => item.status === status).length})
            </Button>
          ))}
        </div>
        {overview.suggestions.filter((item) => item.status === filter).length === 0 && <p className="mt-4 text-sm text-ink-soft">No {filter} suggestions.</p>}
        {overview.suggestions.length > 0 && (
          <div className="mt-4 space-y-3">
            {overview.suggestions[0]?.summary && <p className="text-[13px] text-ink-soft">{overview.suggestions[0].summary}</p>}
            {overview.suggestions.filter((item) => item.status === filter).map((sg, i) => (
              <div key={sg.id} className="rounded-2xl bg-card/60 p-4 ring-1 ring-glass-border">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold">{sg.title} <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] uppercase text-primary">{sg.impact}</span></p>
                    <p className="mt-1 text-[12px] text-ink-soft">{sg.why}</p>
                    <p className="mt-2 text-[13px]">{sg.change}</p>
                    <p className="mt-2 text-[11px] text-ink-soft">Based on {sg.session_count} sessions · {new Date(sg.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copy(i, sg)}>{copied === i ? "Copied" : "Copy"}</Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sg.status === "pending" ? <>
                    <Button size="sm" disabled={saving === sg.id} onClick={() => decide(sg.id, "accepted")}><Check /> Accept</Button>
                    <Button size="sm" variant="outline" disabled={saving === sg.id} onClick={() => decide(sg.id, "declined")}><X /> Decline</Button>
                  </> : <Button size="sm" variant="ghost" disabled={saving === sg.id} onClick={() => decide(sg.id, "pending")}><Undo2 /> Undo decision</Button>}
                  {sg.status === "accepted" && (
                    <Button size="sm" variant={sg.implemented_at ? "ghost" : "outline"} disabled={saving === sg.id} onClick={() => ship(sg.id, !sg.implemented_at)}>
                      <Rocket /> {sg.implemented_at ? "Not live yet" : "Mark as live"}
                    </Button>
                  )}
                </div>
                {sg.implemented_at && <ImpactCard shippedAt={sg.implemented_at} review={impact[sg.id]} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const VERDICT: Record<ImpactReview["verdict"], [string, string]> = {
  improved: ["Improved the experience", "bg-primary/15 text-primary"],
  worsened: ["Made the experience worse", "bg-destructive/15 text-destructive"],
  mixed: ["Mixed or no clear change", "bg-muted text-ink"],
  "too-early": ["Too early to tell", "bg-muted text-ink-soft"],
};
const RESULT_MARK = { improved: "▲ better", worsened: "▼ worse", same: "— same", unknown: "no data" } as const;

function ImpactCard({ shippedAt, review }: { shippedAt: string; review: ImpactReview | undefined }) {
  if (!review) return <p className="mt-3 text-[12px] text-ink-soft">Checking impact…</p>;
  const [label, cls] = VERDICT[review.verdict];
  return (
    <div className="mt-3 rounded-xl bg-background/60 p-3 ring-1 ring-glass-border">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>
        <span className="text-[11px] text-ink-soft">
          Live since {new Date(shippedAt).toLocaleDateString()} · {review.beforeSessions} sessions before vs {review.afterSessions} after ({WINDOW_DAYS} days each side)
        </span>
      </div>
      {review.verdict === "too-early" && (
        <p className="mt-2 text-[11px] text-ink-soft">Needs at least {MIN_SESSIONS_PER_SIDE} sessions before and after the change.</p>
      )}
      <table className="mt-2 w-full text-[12px]">
        <tbody>
          {review.metrics.map((m) => (
            <tr key={m.label}>
              <td className="py-0.5 text-ink-soft">{m.label}</td>
              <td className="py-0.5 text-right">{m.before ?? "—"} → {m.after ?? "—"}</td>
              <td className="py-0.5 pl-3 text-right text-ink-soft">{RESULT_MARK[m.result]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
