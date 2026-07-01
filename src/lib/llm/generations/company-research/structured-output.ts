import { z } from "zod";

// Structured-output contract for the LLM when driven by llm-research-prompt.md.
// The model reports its own provenance (confidence / status / source) based on the
// confidence rubric and STATUS rules in that prompt. This is distinct from
// `result-schema.ts`, which is the NORMALIZED shape after the provider maps the
// raw extraction into computed provenance. Never expose this to consumers outside
// this providers directory — use NormalizedEnrichment instead.

export const llmProvenanceSchema = z.object({
  source: z
    .string()
    .nullable()
    .describe("Short human-readable origin label, e.g. 'Company website', 'LinkedIn'."),
  sourceUrl: z
    .string()
    .nullable()
    .describe(
      "The exact, full URL of the page this field was sourced from (https://...). " +
        "Required whenever status is 'validated'. Set to null only when the value " +
        "was inferred or no single page backs it. Never fabricate or guess a URL.",
    ),
  // No min/max — strict structured-output mode rejects numeric bounds on some
  // providers; bounds are enforced downstream by clamp() + provenanceSchema.
  confidence: z.number(),
  status: z.enum(["validated", "inferred", "cold"]),
});

export type LlmProvenance = z.infer<typeof llmProvenanceSchema>;

const withProvenance = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ value, provenance: llmProvenanceSchema });

export const llmResearchOutputSchema = z.object({
  summary: withProvenance(z.string().nullable()),
  region: withProvenance(z.string().nullable()),
  // `industry` is sourced from HubSpot (`industria_hu`); the model no longer reports it.
  headcount: withProvenance(z.number().nullable()),
  workforcePercentage: withProvenance(z.number().nullable()),
  techStack: z.array(
    z.object({
      tool: z.string(),
      relationshipWithHumand: z.enum(["desplazar", "integrar", "coexistir"]),
      provenance: llmProvenanceSchema,
    }),
  ),
  // Stakeholders carry a leaner provenance than the other fields: just the page
  // they were found on (`sourceUrl`) and `status`. `source` label + `confidence`
  // are synthesized downstream (in `llm-websearch.ts`) — no need to spend tokens
  // self-reporting them per person.
  stakeholders: z.array(
    z.object({
      name: z.string().nullable(),
      title: z.string().nullable(),
      decisionRole: z.string().nullable(),
      email: z.string().nullable(),
      sourceUrl: z
        .string()
        .nullable()
        .describe(
          "Full URL of the page this person was found on — their LinkedIn profile " +
            "or the company page that lists them. Null when the role is inferred.",
        ),
      status: z.enum(["validated", "inferred", "cold"]),
    }),
  ),
  painPoints: z.array(
    z.object({
      painPoint: z.string(),
      provenance: llmProvenanceSchema,
    }),
  ),
});

export type LlmResearchOutput = z.infer<typeof llmResearchOutputSchema>;
