import "server-only";

import type { DealSearchRequest, DealSearchResult } from "@/types";
import type { EnrichmentInput } from "@/lib/enrichment/types";
import { lifecycleStageToStageKey } from "@/lib/constants";
import { getEnrichmentProvider } from "@/lib/enrichment/registry";
import { mapEnrichmentToDeal } from "./enrichment-to-deal";

/**
 * Resolve + enrich a deal.
 *
 * Runs an enrichment provider with the CRM-resolved contact fields, derives the
 * deal stage from the HubSpot lead's `lifecycleStage`, then maps the normalized
 * output into the deal-analysis shape. The provider is chosen per request via
 * `req.enrichmentProvider` (plug-and-play from the client), falling back to the
 * `ENRICHMENT_PROVIDER` env default. Errors propagate to the route handler,
 * which surfaces them on the analysis error screen.
 *
 * Returns the resolved provider name alongside the result so the route can log
 * which provider actually ran (not just the per-request hint, which is empty
 * when the `ENRICHMENT_PROVIDER` env default is used).
 */
export async function enrichDeal(
  req: DealSearchRequest,
): Promise<{ provider: string; result: DealSearchResult }> {
  const input: EnrichmentInput = {
    email: req.contactEmail ?? req.email,
    domain: req.companyDomain ?? req.website,
    jobTitle: req.jobTitle,
    companyName: req.companyName ?? req.name,
  };

  const enrichment = await getEnrichmentProvider(req.enrichmentProvider).enrich(input);
  const result = mapEnrichmentToDeal(enrichment.data, {
    resolvedName: req.companyName ?? req.name,
    stage: lifecycleStageToStageKey(req.lifecycleStage),
    deal: req.deal,
  });
  return { provider: enrichment.provider, result };
}
