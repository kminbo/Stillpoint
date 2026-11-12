import { z } from "zod";

export const suggestionDecisionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "accepted", "declined"]),
});