import { ENRICHMENT_PROVIDER } from "../server/env.js";
import type { EnrichmentProvider } from "./types.js";
import { llmWebSearchProvider } from "./providers/llm-websearch.js";
import { classidyProvider } from "./providers/classidy.js";
import { mockEnrichmentProvider } from "./providers/mock.js";
import { lushaProvider } from "./providers/lusha.js";

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
