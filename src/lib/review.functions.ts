import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { summarizeUsage } from "@/lib/usage-summary";
import { suggestionDecisionSchema } from "@/lib/suggestion-decisions";
import { reviewImpact, type ImpactReview } from "@/lib/impact-review";
import { z } from "zod";
import { buildReviewInput } from "./review-safety";
import { FEEDBACK_OPTIONS } from "./feedback-options";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error("Could not check access.");
  if (!data) throw new Error("Only the owner can open the review page.");
}

async function loadUsage(supabase: SupabaseClient<Database>) {
  const [sessions, feedback] = await Promise.all([
    supabase.from("usage_sessions").select("seconds, distractions, focus_tracking, posture_tracking, blur, sound, notification, timer_minutes, ended_by").order("created_at", { ascending: false }).limit(500),
    supabase.from("session_feedback").select("rating, comment, created_at").order("created_at", { ascending: false }).limit(200),
  ]);
  if (sessions.error || feedback.error) throw new Error("Could not load usage data.");
  return { sessions: sessions.data ?? [], feedback: (feedback.data ?? []).map((row) => ({ ...row, comment: FEEDBACK_OPTIONS.some((topic) => topic === row.comment) ? row.comment : null })) };
}

export const getUsageOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { sessions, feedback } = await loadUsage(context.supabase);
    const { data: suggestions, error } = await context.supabase.from("review_suggestions").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error("Could not load saved suggestions.");
    return {
      summary: summarizeUsage(sessions, feedback),
      suggestions: suggestions ?? [],
      comments: feedback.filter((f): f is typeof f & { comment: string } => Boolean(f.comment)).slice(0, 20),
    };
  });

export const generateSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { sessions, feedback } = await loadUsage(context.supabase);
    if (!sessions.length) return { ok: false as const, error: "Complete a focus session before requesting improvements." };
    const { runReviewAgent, GatewayError } = await import("@/lib/ai/review-agent.server");
    try {
      const summary = summarizeUsage(sessions, feedback);
      const result = await runReviewAgent(buildReviewInput(sessions, feedback));
      if (!result.suggestions.length) return { ok: false as const, error: "The review agent returned no suggestions." };
      const { data: saved, error } = await context.supabase.from("review_suggestions").insert(result.suggestions.map((suggestion) => ({
        ...suggestion,
        summary: result.summary,
        generated_by: context.userId,
        session_count: summary.sessions,
      }))).select("*");
      if (error) return { ok: false as const, error: "Could not save suggestions. Please try again later." };
      return { ok: true as const, summary: result.summary, suggestions: saved ?? [] };
    } catch (e) {
      return { ok: false as const, error: e instanceof GatewayError ? e.message : "The review agent failed." };
    }
  });

export const decideSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => suggestionDecisionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: saved, error } = await context.supabase.from("review_suggestions").update({
      status: data.status,
      decided_at: data.status === "pending" ? null : new Date().toISOString(),
      decided_by: data.status === "pending" ? null : context.userId,
      ...(data.status !== "accepted" ? { implemented_at: null } : {}),
    }).eq("id", data.id).select("*").single();
    if (error) throw new Error("Could not save your decision.");
    return saved;
  });

export const markImplemented = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), implemented: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: saved, error } = await context.supabase.from("review_suggestions")
      .update({ implemented_at: data.implemented ? new Date().toISOString() : null })
      .eq("id", data.id).eq("status", "accepted").select("*").single();
    if (error) throw new Error("Could not save. Only accepted suggestions can be marked as live.");
    return saved;
  });

export const getImpactReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: shipped, error } = await context.supabase.from("review_suggestions")
      .select("id, implemented_at").not("implemented_at", "is", null);
    if (error) throw new Error("Could not load shipped changes.");
    if (!shipped?.length) return {} as Record<string, ImpactReview>;
    const live = shipped.filter((s): s is typeof s & { implemented_at: string } => s.implemented_at !== null);
    if (!live.length) return {} as Record<string, ImpactReview>;
    const earliest = Math.min(...live.map((s) => new Date(s.implemented_at).getTime())) - 15 * 86400000;
    const since = new Date(earliest).toISOString();
    const [sessions, feedback] = await Promise.all([
      context.supabase.from("usage_sessions").select("created_at, seconds, distractions, timer_minutes, ended_by").gte("created_at", since).limit(5000),
      context.supabase.from("session_feedback").select("created_at, rating").gte("created_at", since).limit(5000),
    ]);
    if (sessions.error || feedback.error) throw new Error("Could not load usage data.");
    const out: Record<string, ImpactReview> = {};
    for (const s of live) out[s.id] = reviewImpact(s.implemented_at, sessions.data ?? [], feedback.data ?? []);
    return out;
  });
