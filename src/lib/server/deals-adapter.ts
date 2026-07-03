import type { DealSearchRequest, DealSearchResult, LeadDeal } from "../../types/index.js";
import type { EnrichmentInput } from "../enrichment/types.js";
import { lifecycleStageToStageKey } from "../constants.js";
import { getEnrichmentProvider } from "../enrichment/registry.js";
import { computeCompanyKey } from "../persistence/company-key.js";
import { getPersistenceProvider } from "../persistence/registry.js";
import type { DealAnalysisRecord, DealRecord, SyncDealInput } from "../persistence/types.js";
import { mapEnrichmentToDeal, toIndustry } from "./enrichment-to-deal.js";
import { createLogger } from "./logger.js";
import { getSuccessCasesByIndustry } from "./success-cases-reader.js";

const log = createLogger("deals-adapter");

function buildSyncInput(req: DealSearchRequest, resolvedName: string): SyncDealInput {
  const deal = req.deal;
  return {
    hubspotDealId: deal?.id ?? null,
    companyKey: computeCompanyKey(resolvedName),
    resolvedName,
    domain: req.companyDomain ?? req.website ?? null,
    region: null,
    stage: lifecycleStageToStageKey(req.lifecycleStage),
    amount: deal?.amount ?? null,
    segment: deal?.segment ?? null,
    industry: deal?.industry ?? null,
    lastActivity: null,
    integraciones: deal?.integraciones ?? null,
    integrationModules: deal?.integrationModules ?? null,
    modulosDeInteres: deal?.modulosDeInteres ?? null,
    painDetected: deal?.painDetected ?? null,
  };
}


function overlayHubspotFields(
  analysis: DealAnalysisRecord,
  req: DealSearchRequest,
  dealRow: DealRecord,
): DealSearchResult {
  const stored = analysis.result;
  const deal: LeadDeal | undefined = req.deal;
  return {
    ...stored,
    signals: analysis.signals,
    preCallBrief: analysis.preCallBrief,
    deal: {
      ...stored.deal,
      stage: lifecycleStageToStageKey(req.lifecycleStage),
      firmographics: {
        ...stored.deal.firmographics,
        industry: toIndustry(deal),
      },
      hubspot: {
        dealId: deal?.id ?? stored.deal.hubspot.dealId,
        dealStage: deal?.stageLabel ?? stored.deal.hubspot.dealStage,
        amount: deal?.amount ?? stored.deal.hubspot.amount,
        lastActivity: dealRow.lastActivity ?? stored.deal.hubspot.lastActivity,
        notes: stored.deal.hubspot.notes,
        segment: deal?.segment ?? stored.deal.hubspot.segment,
        integraciones: deal?.integraciones ?? stored.deal.hubspot.integraciones,
      },
    },
  };
}


/** DealCraft only analyzes an actual HubSpot deal — thrown when `req.deal.id`
 *  is missing, mapped to 400 by `api/deals/search.ts`'s `enrichRules`. */
export class NoAssociatedDealError extends Error {
  constructor() {
    super("No HubSpot deal associated with this lead — add the deal in HubSpot before continuing.");
    this.name = "NoAssociatedDealError";
  }
}

export async function enrichDeal(
  req: DealSearchRequest,
): Promise<{ provider: string; result: DealSearchResult; meta?: Record<string, unknown> }> {
  if (!req.deal?.id) {
    throw new NoAssociatedDealError();
  }

  const persistence = getPersistenceProvider();
  const resolvedName = req.companyName ?? req.name;
  const hubspotDealId = req.deal.id;

  const existingDeal = await persistence.findDeal({ hubspotDealId });
  const existingAnalysis = existingDeal
    ? await persistence.getLatestAnalysis(existingDeal.id)
    : null;

  if (existingDeal && existingAnalysis && !req.refresh) {
    const dealRow = await persistence.syncDealFromHubspot(buildSyncInput(req, resolvedName));
    const result = overlayHubspotFields(existingAnalysis, req, dealRow);
    return { provider: "stored", result, meta: undefined };
  }

  const input: EnrichmentInput = {
    email: req.contactEmail ?? req.email,
    domain: req.companyDomain ?? req.website,
    jobTitle: req.jobTitle,
    companyName: resolvedName,
    language: req.language,
  };

  const enrichment = await getEnrichmentProvider(req.enrichmentProvider).enrich(input);
  const result = mapEnrichmentToDeal(enrichment.data, {
    resolvedName,
    stage: lifecycleStageToStageKey(req.lifecycleStage),
    deal: req.deal,
  });

  const industry = result.deal.firmographics.industry.value === "—"
    ? null
    : result.deal.firmographics.industry.value;
  result.successCases = await getSuccessCasesByIndustry(industry);
  const dealRow = await persistence.syncDealFromHubspot(buildSyncInput(req, resolvedName));
  const analysis = await persistence.refreshAnalysis({
    dealId: dealRow.id,
    result,
    coldStart: !existingDeal,
    generatedAt: new Date().toISOString(),
  });


  for (const entry of enrichment.usage) {
    try {
      await persistence.insertLlmCall({
        ...entry,
        dealId: dealRow.id,
        dealAnalysisId: analysis.id,
      });
    } catch (err) {
      log.warn("insertLlmCall failed, continuing", {
        callId: entry.callId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const meta: Record<string, unknown> = { ...enrichment.meta };
  if (req.benchmark) meta.raw = enrichment.raw;
  return { provider: enrichment.provider, result, meta: Object.keys(meta).length ? meta : undefined };
}
