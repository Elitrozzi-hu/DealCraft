import "server-only";

import { ENRICHMENT_PROVIDER } from "@/lib/server/env";
import type { EnrichmentProvider } from "@/lib/enrichment/types";
import { llmWebSearchProvider } from "@/lib/enrichment/providers/llm-websearch";
import { classidyProvider } from "@/lib/enrichment/providers/classidy";
import { mockEnrichmentProvider } from "@/lib/enrichment/providers/mock";
import { lushaProvider } from "@/lib/enrichment/providers/lusha";

// Enrichment provider registry. The single place that knows which providers
// exist. Golden rule: adding a provider = a new file + one line here.
const providers: Record<string, EnrichmentProvider> = {
  "llm-websearch": llmWebSearchProvider,
  classidy: classidyProvider,
  mock: mockEnrichmentProvider,
  lusha: lushaProvider,
};

/**
 * Resolve an enrichment provider by name.
 * @param name registry key; defaults to `ENRICHMENT_PROVIDER` env, then `llm-websearch`.
 */
export function getEnrichmentProvider(name?: string): EnrichmentProvider {
  const key = name ?? ENRICHMENT_PROVIDER ?? "llm-websearch";
  const provider = providers[key];
  if (!provider) {
    throw new Error(
      `Unknown enrichment provider "${key}". Known providers: ${Object.keys(providers).join(", ")}.`,
    );
  }
  return provider;
}
