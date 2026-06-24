import "server-only";

import { z } from "zod";

import { generate } from "@/lib/llm/generate";
import { getOpenRouterProvider } from "@/lib/llm/registry";
import type {
  EnrichmentInput,
  EnrichmentProvider,
  EnrichmentResult,
} from "@/lib/enrichment/types";
import {
  coldProv,
  enrichmentResultSchema,
  type NormalizedEnrichment,
  type NormalizedProvenance,
} from "@/lib/enrichment/result-schema";

// Enrichment via the LLM's own web-search server tool. This is the ONLY module
// that knows OpenRouter's web-search contract (param names + tool placement);
// everything else talks to `generate` and the `EnrichmentProvider` interface.
//
// Flow (schema XOR tools — two calls + a normalize):
//   1. free-text `generate` with the `openrouter:web_search` server tool → live findings
//   2. structured `generate({ schema: extractionSchema })` → plain facts
//   3. `normalize` → the shared `NormalizedEnrichment` shape (provenance computed
//      here, NEVER self-reported by the model) so it flows through `mapEnrichmentToDeal`.

// --- Per-request search-steering options ----------------------------------
// Validated before use. Providers that don't support a knob ignore it.
export const optionsSchema = z.object({
  /** Cap on search results pulled in. */
  maxResults: z.number().int().positive().optional(),
  /** Breadth of retrieved context per result. */
  searchContextSize: z.enum(["low", "medium", "high"]).optional(),
  /** Restrict the search to these domains (server tool: `allowed_domains`). */
  includeDomains: z.array(z.string()).optional(),
  /** Exclude these domains (server tool: `excluded_domains`). */
  excludeDomains: z.array(z.string()).optional(),
  /** Custom prompt that steers how results are folded into the answer. */
  searchPrompt: z.string().optional(),
  /** Override the research query (defaults to a prompt built from `input`). */
  query: z.string().optional(),
});

export type WebSearchOptions = z.infer<typeof optionsSchema>;

/**
 * Translate our provider-agnostic options into OpenRouter's `openrouter:web_search`
 * server-tool params. The args flow through the tool factory and are snake-cased
 * onto the API tool descriptor at request time. Note the current server-tool
 * names: `allowed_domains` / `excluded_domains` (NOT the deprecated plugin's
 * `include_domains`). The only place that encodes this vendor contract.
 */
function mapToOpenRouter(o: WebSearchOptions): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  if (o.maxResults !== undefined) mapped.max_results = o.maxResults;
  if (o.searchContextSize !== undefined)
    mapped.search_context_size = o.searchContextSize;
  if (o.includeDomains !== undefined) mapped.allowed_domains = o.includeDomains;
  if (o.excludeDomains !== undefined) mapped.excluded_domains = o.excludeDomains;
  if (o.searchPrompt !== undefined) mapped.search_prompt = o.searchPrompt;
  return mapped;
}

// --- LLM extraction shape --------------------------------------------------
// The plain facts we ask the model to pull from its findings. NO confidence or
// provenance here — those are computed in `normalize`, never trusted from the
// model (per the "confidence is computed" rule). All fields optional/nullable so
// partial enrichment is valid.
const extractionSchema = z.object({
  company: z
    .object({
      industry: z.string().nullish(),
      region: z.string().nullish(),
      headcount: z.number().nullish(),
      /** Share of the workforce that is deskless/frontline, 0–100 if known. */
      desklessPercentage: z.number().nullish(),
      summary: z.string().nullish(),
      techStack: z.array(z.string()).nullish(),
    })
    .nullish(),
  stakeholders: z
    .array(
      z.object({
        name: z.string().nullish(),
        title: z.string().nullish(),
        role: z.string().nullish(),
        email: z.string().nullish(),
        linkedinUrl: z.string().nullish(),
      }),
    )
    .nullish(),
  pains: z.array(z.string()).nullish(),
  sources: z.array(z.string()).nullish(),
});

type Extraction = z.infer<typeof extractionSchema>;

// Web-search data is researched, not declared — always "inferred", never
// "validated". Confidence is a flat inferred prior; presence is what varies.
const WEB_SOURCE = "Web search";
function webProv(): NormalizedProvenance {
  return { source: WEB_SOURCE, sourceType: "inferido", confidence: 0.6, status: "inferred" };
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Wrap a researched string in inferred provenance, or fall back to a cold "—". */
function inferredString(value: string | null | undefined) {
  return value && value.trim()
    ? { value, prov: webProv() }
    : { value: "—", prov: coldProv(WEB_SOURCE) };
}

/** Map the model's plain extraction into the shared normalized shape. */
function normalize(extracted: Extraction): NormalizedEnrichment {
  const company = extracted.company ?? {};
  const techItems = (company.techStack ?? [])
    .filter((t) => typeof t === "string" && t.trim())
    .map((name) => ({ name, kind: "coexistir" as const }));

  return {
    summary: inferredString(company.summary),
    region: inferredString(company.region),
    industry: inferredString(company.industry),
    workforcePercentage:
      typeof company.desklessPercentage === "number"
        ? { value: clamp(company.desklessPercentage, 0, 100), prov: webProv() }
        : null,
    headcount:
      typeof company.headcount === "number"
        ? { value: Math.max(0, Math.round(company.headcount)), prov: webProv() }
        : null,
    techStack: {
      items: techItems,
      prov: techItems.length ? webProv() : coldProv(WEB_SOURCE),
    },
    stakeholders: (extracted.stakeholders ?? [])
      .filter((s) => typeof s.name === "string" && s.name.trim())
      .map((s) => ({
        name: s.name as string,
        title: s.title ?? "",
        decisionRole: s.role ?? null,
        email: s.email ?? null,
        linkedinUrl:
          s.linkedinUrl && /^https?:\/\//i.test(s.linkedinUrl)
            ? s.linkedinUrl
            : null,
        prov: webProv(),
      })),
    painPoints: (extracted.pains ?? [])
      .filter((p) => typeof p === "string" && p.trim())
      .map((label) => ({ label, prov: webProv() })),
  };
}

export const llmWebSearchProvider: EnrichmentProvider<WebSearchOptions> = {
  name: "llm-websearch",
  async enrich(
    input: EnrichmentInput,
    rawOptions?: WebSearchOptions,
  ): Promise<EnrichmentResult> {
    const options = optionsSchema.parse(rawOptions ?? {});

    // 1) Live web search (tools path — no schema).
    const openrouter = getOpenRouterProvider();
    const webSearch = openrouter.tools.webSearch(
      mapToOpenRouter(options) as Parameters<
        typeof openrouter.tools.webSearch
      >[0],
    );
    const findings = await generate({
      provider: "openrouter",
      tools: { web_search: webSearch },
      prompt:
        options.query ?? `Research this contact: ${JSON.stringify(input)}`,
    });

    // 2) Extract plain facts (schema path — no tools).
    const extracted = await generate({
      provider: "openrouter",
      schema: extractionSchema,
      prompt: `Extract the following enrichment facts into the required JSON shape. Use null for anything unknown; do not invent data.\n\n${findings}`,
    });

    // 3) Normalize to the shared provenanced shape (provenance computed here).
    const data = normalize(extracted);

    return {
      provider: "llm-websearch",
      data: enrichmentResultSchema.parse(data) as Record<string, unknown>,
      raw: findings,
    };
  },
};
