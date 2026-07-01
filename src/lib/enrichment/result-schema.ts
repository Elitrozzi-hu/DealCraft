import { z } from "zod";

import { TECH_KINDS } from "@/types";

// The normalized, provider-agnostic enrichment shape. EVERY enrichment provider
// (classidy, llm-websearch, mock) normalizes its vendor response into this one
// shape, and the deal mapper (`lib/server/enrichment-to-deal.ts`) consumes only
// this. It mirrors `company-enrichment-schema.json`. Provenance carries
// `source · sourceType · confidence · status` (NO timestamp). Optional
// firmographics (`workforcePercentage`, `headcount`) are nullish so partial
// enrichment still validates.
//
// This shape used to live inside `providers/classidy.ts`; it was hoisted here so
// it isn't owned by one concrete provider — the contract is shared.

export const provenanceSchema = z.object({
  source: z.string(),
  sourceType: z.string(),
  confidence: z.number().min(0).max(1),
  status: z.enum(["validated", "inferred", "cold"]),
  /** Resolvable source URL when one genuinely exists (the UI turns the badge into
   *  a link to it). Optional — only populated for non-inferred fields a provider
   *  could trace back to a real page; never fabricated. */
  url: z.string().optional(),
});

export type NormalizedProvenance = z.infer<typeof provenanceSchema>;

/** A value paired with its provenance. */
const provenanced = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ value, prov: provenanceSchema });

export const enrichmentResultSchema = z.object({
  summary: provenanced(z.string()),
  region: provenanced(z.string()),
  // `industry` is sourced from the HubSpot deal (`industria_hu`), not enrichment.
  workforcePercentage: provenanced(z.number().min(0).max(100)).nullish(),
  headcount: provenanced(z.number().int().min(0)).nullish(),
  techStack: z.object({
    items: z.array(
      z.object({
        name: z.string(),
        kind: z.enum(TECH_KINDS),
        // Per-tool provenance (each tool can come from a different page). Optional
        // so providers that only have a stack-level source still validate.
        prov: provenanceSchema.optional(),
      }),
    ),
    prov: provenanceSchema,
  }),
  stakeholders: z.array(
    z.object({
      name: z.string(),
      title: z.string(),
      // Free-form decision role ("CEO/General Management"), collapsed to a
      // buying-committee `Role` downstream — keep it a string here.
      decisionRole: z.string().nullish(),
      email: z.string().nullish(),
      linkedinUrl: z.string().nullish(),
      prov: provenanceSchema,
    }),
  ),
  painPoints: z.array(
    z.object({
      label: z.string(),
      prov: provenanceSchema,
    }),
  ),
});

export type NormalizedEnrichment = z.infer<typeof enrichmentResultSchema>;

/** A synthesized "cold" provenance for fields a provider omitted entirely. */
export function coldProv(source: string): NormalizedProvenance {
  return { source, sourceType: "sin dato", confidence: 0, status: "cold" };
}
