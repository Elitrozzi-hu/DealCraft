import { z } from "zod";

import { SIGNAL_TYPES, type SignalItem } from "../../../../types/index.js";

// Structured-output contract for the signals LLM call — mirrors the
// `humand_signals` JSON schema in the feature spec.
// No min/max on numbers — strict structured-output mode rejects numeric bounds
// on some providers; validation happens downstream if needed.

export const signalItemSchema = z.object({
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  type: z.enum(SIGNAL_TYPES),
  headline: z.string(),
  date: z.string().nullable(),
  summary: z.string(),
  source_url: z.string(),
  status: z.enum(["verified", "inferred"]),
  confidence: z.number(),
});
void ((item: z.infer<typeof signalItemSchema>): SignalItem => item);
void ((item: SignalItem): z.infer<typeof signalItemSchema> => item);

export const humandSignalsSchema = z.object({
  company: z.string(),
  domain: z.string(),
  signals: z.array(signalItemSchema),
});
