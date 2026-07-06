import { randomUUID } from "node:crypto";

import { z } from "zod";

import { generate, type GenerationUsage } from "../../llm/generate.js";
import type { LlmProvider } from "../../llm/registry.js";
import type { LlmUsageEntry } from "../../llm/types.js";
import { ENRICHMENT_LLM_PROVIDER } from "../../server/env.js";
import {
  llmResearchOutputSchema,
  type LlmResearchOutput,
} from "../../llm/generations/company-research/structured-output.js";
import { renderResearchPrompt } from "../../llm/generations/company-research/prompt.js";
import { normalize as normalizeResearchOutput } from "../../llm/generations/company-research/normalize.js";
import { createLogger } from "../../server/logger.js";
import type {
  EnrichmentInput,
  EnrichmentProvider,
  EnrichmentResult,
} from "../types.js";
import {
  enrichmentResultSchema,
  type NormalizedEnrichment,
} from "../result-schema.js";

// Enrichment via a SINGLE OpenRouter call: the `web` plugin runs live search while
// `llmResearchOutputSchema` (structured output) shapes the reply. This is the ONLY
// module that knows the plugin is how web search is enabled here; everything else
// talks to `generate` and the `EnrichmentProvider` interface.
//
// Flow:
//   1. one `generate({ schema, providerOptions: { openrouter: { plugins: [web] } } })`
//      → the model researches and returns the rich, per-field provenanced shape.
//   2. `normalize` → the shared `NormalizedEnrichment` shape, clamping/coercing at
//      the boundary so it flows through `mapEnrichmentToDeal`.
//   3. `enrichmentResultSchema.parse` is the final contract guard.
//
// NOTE on provenance: unlike most providers, confidence here is the model's own
// per-field self-report (governed by the prompt's confidence rubric), mirroring how
// `cassidy` passes vendor-reported confidence through. It is clamped to [0,1] in
// `fromLlmProv`; see the plan's "Constraints & Decisions" for the rationale.

const log = createLogger("llm-websearch");

// --- Per-request search-steering options ----------------------------------
// Validated before use. Only knobs the OpenRouter `web` plugin actually supports.
const optionsSchema = z.object({
  /** Cap on search results pulled in (plugin: `max_results`). */
  maxResults: z.number().int().positive().optional(),
  /** Custom prompt that steers how results are folded in (plugin: `search_prompt`). */
  searchPrompt: z.string().optional(),
  /** Override the research query (defaults to a prompt built from `input`). */
  query: z.string().optional(),
});

type WebSearchOptions = z.infer<typeof optionsSchema>;

/** Default research query when the caller doesn't override it. */
export function buildQuery(input: EnrichmentInput): string {
  const parts: string[] = [];
  if (input.companyName) parts.push(input.companyName);
  if (input.domain) parts.push(input.domain);
  return parts.length
    ? `${parts.join(" ")} company enrichment profile`
    : "company enrichment profile";
}

const DEFAULT_SOURCE = "Web research";

export const llmWebSearchProvider: EnrichmentProvider<WebSearchOptions> = {
  name: "llm-websearch",
  async enrich(
    input: EnrichmentInput,
    rawOptions?: WebSearchOptions,
  ): Promise<EnrichmentResult> {
    const options = optionsSchema.parse(rawOptions ?? {});
    const name = input.companyName ?? "";
    const domain = input.domain ?? (input.email?.split("@")[1] ?? "");
    const language = input.language ?? "es";


    const plugin: Record<string, unknown> = {
      id: "web",
      engine: "exa",
      max_results: options.maxResults ?? 8,
    };
    if (options.searchPrompt) plugin.search_prompt = options.searchPrompt;

    const query = options.query ?? buildQuery(input);
    const llmProvider = (ENRICHMENT_LLM_PROVIDER ?? "openrouter") as LlmProvider;
    const callId = randomUUID();

    log.info("enrich started", { company: name, domain });
    const t0 = Date.now();

    let usage: GenerationUsage | undefined;
    let extracted: LlmResearchOutput;
    try {
      extracted = await generate({
        // Validated at runtime by the LLM registry (unknown key → throws).
        provider: llmProvider,
        schema: llmResearchOutputSchema,
        system: renderResearchPrompt(name, domain, language),
        prompt: query,
        providerOptions: {
          openrouter: { plugins: [plugin], usage: { include: true } },
        },
        onUsage: (u) => {
          usage = u;
        },
      });
    } catch (err) {
      log.error("generate failed", {
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    log.debug("extraction done", {
      stakeholders: extracted.stakeholders.length,
      techItems: extracted.techStack.length,
    });

    let data: NormalizedEnrichment;
    try {
      data = normalizeResearchOutput(extracted, DEFAULT_SOURCE);
    } catch (err) {
      log.error("normalize failed", {
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    log.info("enrich complete", {
      durationMs: Date.now() - t0,
      model: usage?.model,
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      totalTokens: usage?.totalTokens,
      costUsd: usage?.costUsd != null ? Number(usage.costUsd.toFixed(4)) : undefined,
      citations: usage?.citations,
    });
    if (usage?.citationUrls?.length) {
      log.debug("citations", { urls: usage.citationUrls.slice(0, 5).join(", ") });
    }

    const usageEntries: LlmUsageEntry[] = usage
      ? [
          {
            callId,
            task: "company-research",
            provider: llmProvider,
            model: usage.model,
            inputTokens: usage.inputTokens ?? null,
            outputTokens: usage.outputTokens ?? null,
            totalTokens: usage.totalTokens ?? null,
            costUsd: usage.costUsd ?? null,
          },
        ]
      : [];

    return {
      provider: "llm-websearch",
      data: enrichmentResultSchema.parse(data),
      raw: extracted,
      meta: {
        costUsd: usage?.costUsd ?? null,
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        durationMs: Date.now() - t0,
      },
      usage: usageEntries,
    };
  },
};
