import { z } from "zod";

import { generate, type GenerationUsage } from "@/lib/llm/generate";
import type { LlmProvider } from "@/lib/llm/registry";
import { ENRICHMENT_LLM_PROVIDER } from "@/lib/server/env";
import {
  llmResearchOutputSchema,
  type LlmResearchOutput,
  type LlmProvenance,
} from "@/lib/llm/generations/company-research/structured-output";
import { renderResearchPrompt } from "@/lib/llm/generations/company-research/prompt";
import { createLogger } from "@/lib/server/logger";
import type {
  EnrichmentInput,
  EnrichmentProvider,
  EnrichmentResult,
} from "@/lib/enrichment/types";
import { clamp } from "@/lib/enrichment/clamp";
import {
  coldProv,
  enrichmentResultSchema,
  type NormalizedEnrichment,
  type NormalizedProvenance,
} from "@/lib/enrichment/result-schema";

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
// `classidy` passes vendor-reported confidence through. It is clamped to [0,1] in
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


/** If `s` is a usable http(s) URL, return its canonical href + a tidy label
 *  (the www-stripped hostname); otherwise null. The prompt allows `source` to be
 *  "URL or source name", so this tells the two apart without trusting the model. */
export function asSourceUrl(s: string | null): { href: string; label: string } | null {
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return { href: u.href, label: u.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

/** Default research query when the caller doesn't override it. */
export function buildQuery(input: EnrichmentInput): string {
  const parts: string[] = [];
  if (input.companyName) parts.push(input.companyName);
  if (input.domain) parts.push(input.domain);
  return parts.length
    ? `${parts.join(" ")} company enrichment profile`
    : "company enrichment profile";
}

// `status` is now the single inference signal (the model no longer self-reports a
// separate `sourceType`); derive a human-readable type label from it for the badge.
const SOURCE_TYPE_BY_STATUS: Record<LlmProvenance["status"], string> = {
  validated: "declarado",
  inferred: "inferido",
  cold: "sin dato",
};

// Stakeholders carry a leaner shape (just `sourceUrl` + `status`, no self-reported
// confidence); compute confidence from status instead, per the "confidence is
// computed, not LLM-self-reported" convention.
const CONFIDENCE_BY_STATUS: Record<LlmProvenance["status"], number> = {
  validated: 0.9,
  inferred: 0.5,
  cold: 0.2,
};

/** Build the normalized provenance for a stakeholder from its lean self-report.
 *  A link is surfaced only for a validated person citing a real page. */
export function stakeholderProv(
  sourceUrl: string | null,
  status: LlmProvenance["status"],
): NormalizedProvenance {
  const link = status === "validated" ? asSourceUrl(sourceUrl) : null;
  return {
    source: link?.label ?? "Web research",
    sourceType: SOURCE_TYPE_BY_STATUS[status],
    confidence: CONFIDENCE_BY_STATUS[status],
    status,
    ...(link ? { url: link.href } : {}),
  };
}

/** Map the model's self-reported provenance into our normalized shape, with
 *  honest defaults and confidence clamped to [0,1] (the sent schema no longer
 *  bounds it). */
export function fromLlmProv(p: LlmProvenance): NormalizedProvenance {
  // Surface a clickable source link ONLY for non-inferred fields that cite a real
  // URL. An inferred/cold field is a benchmark/estimate with no page to open, so it
  // stays a plain badge (matches the "link only when the source is not inferido"
  // rule and the never-fabricate-a-destination policy). Prefer the explicit
  // `sourceUrl`; fall back to `source` when the model put a URL there instead.
  const link =
    p.status === "validated"
      ? (asSourceUrl(p.sourceUrl) ?? asSourceUrl(p.source))
      : null;
  // If `source` itself is a URL, show a tidy hostname rather than the raw link.
  const sourceLabel = asSourceUrl(p.source)?.label ?? p.source ?? "Web research";
  return {
    source: sourceLabel,
    sourceType: SOURCE_TYPE_BY_STATUS[p.status],
    confidence: clamp(p.confidence, 0, 1),
    status: p.status,
    ...(link ? { url: link.href } : {}),
  };
}

/** Map the model's rich research output into the shared normalized shape. */
export function normalize(out: LlmResearchOutput): NormalizedEnrichment {
  const WEB = "Web research";
  return {
    summary: out.summary.value?.trim()
      ? { value: out.summary.value, prov: fromLlmProv(out.summary.provenance) }
      : { value: "—", prov: coldProv(WEB) },
    region: out.region.value?.trim()
      ? { value: out.region.value, prov: fromLlmProv(out.region.provenance) }
      : { value: "—", prov: coldProv(WEB) },
    workforcePercentage:
      typeof out.workforcePercentage.value === "number"
        ? {
            value: clamp(out.workforcePercentage.value, 0, 100),
            prov: fromLlmProv(out.workforcePercentage.provenance),
          }
        : null,
    headcount:
      typeof out.headcount.value === "number"
        ? {
            value: Math.max(0, Math.round(out.headcount.value)),
            prov: fromLlmProv(out.headcount.provenance),
          }
        : null,
    techStack: {
      items: out.techStack
        .filter((t) => t.tool.trim())
        .map((t) => ({
          name: t.tool,
          kind: t.relationshipWithHumand,
          prov: fromLlmProv(t.provenance),
        })),
      prov: out.techStack.length
        ? fromLlmProv(out.techStack[0].provenance)
        : coldProv(WEB),
    },
    stakeholders: out.stakeholders
      // Keep anyone the model could place on the buying committee: rule #1 of the
      // prompt makes it null an unverifiable NAME, so a real CFO with no confirmed
      // name still arrives as { name: null, title: "CFO", decisionRole: ... }.
      // Dropping those (old `s.name?.trim()` filter) hid stakeholders the research
      // genuinely found; keep them when any identifying field is present.
      .filter((s) => s.name?.trim() || s.title?.trim() || s.decisionRole?.trim())
      .map((s) => ({
        name: s.name?.trim() ?? "",
        title: s.title ?? "",
        decisionRole: s.decisionRole ?? null,
        email: s.email ?? null,
        prov: stakeholderProv(s.sourceUrl, s.status),
      })),
    painPoints: out.painPoints
      .filter((p) => p.painPoint.trim())
      .map((p) => ({ label: p.painPoint, prov: fromLlmProv(p.provenance) })),
  };
}

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

    log.info("enrich started", { company: name, domain });
    const t0 = Date.now();

    let usage: GenerationUsage | undefined;
    let extracted: LlmResearchOutput;
    try {
      extracted = await generate({
        // Validated at runtime by the LLM registry (unknown key → throws).
        provider: (ENRICHMENT_LLM_PROVIDER ?? "openrouter") as LlmProvider,
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
      painPoints: extracted.painPoints.length,
      techItems: extracted.techStack.length,
    });

    let data: NormalizedEnrichment;
    try {
      data = normalize(extracted);
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
    };
  },
};
