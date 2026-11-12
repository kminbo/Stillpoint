import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { consentActionSchema } from "./usage-schema";

export const manageUsage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const checked = consentActionSchema.safeParse(input);
    if (!checked.success) throw new Error("Invalid sharing request. Choose a fixed feedback topic; custom text and additional fields are not accepted.");
    return checked.data;
  })
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Sharing is temporarily unavailable. Please try again.");
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: result, error } = await client.rpc("manage_usage_consent", {
      _token: data.token,
      _action: data.action,
      _input: "input" in data ? data.input : {},
    });
    if (error) throw new Error(data.action === "withdraw"
      ? "Sharing is off, but deletion could not finish. Please retry."
      : "Could not save. Sharing may have been withdrawn.");
    return { id: result && typeof result === "object" && !Array.isArray(result) && typeof result["id"] === "string" ? result["id"] : null };
  });