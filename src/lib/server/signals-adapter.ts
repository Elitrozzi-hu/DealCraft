import { getSignalsProvider } from "../signals/registry.js";
import { computeCompanyKey } from "../persistence/company-key.js";
import { getPersistenceProvider } from "../persistence/registry.js";
import { createLogger } from "./logger.js";
import type { Language, SignalsResult } from "../../types/index.js";

const log = createLogger("signals");
export async function fetchSignals(
  company: string,
  domain: string,
  language: Language = "es",
  hubspotDealId: string | null = null,
): Promise<SignalsResult> {
  log.info("signals started", { company, domain });
  const t0 = Date.now();

  const { data: result, usage } = await getSignalsProvider().fetch({ company, domain, language });

  log.info("signals complete", {
    durationMs: Date.now() - t0,
    count: result.signals.length,
  });

  const target = await resolveLatestAnalysis(company, hubspotDealId);

  if (target) {
    const persisted = await getPersistenceProvider().updateSignals(
      target.dealAnalysisId,
      result,
      1,
    );
    if (!persisted) {
      log.warn("signals: stale write skipped (analysis no longer latest)", {
        dealAnalysisId: target.dealAnalysisId,
      });
    }
  }

  for (const entry of usage) {
    try {
      await getPersistenceProvider().insertLlmCall({
        ...entry,
        dealId: target?.dealId ?? null,
        dealAnalysisId: target?.dealAnalysisId ?? null,
      });
    } catch (err) {
      log.warn("insertLlmCall failed, continuing", {
        callId: entry.callId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}

export async function resolveLatestAnalysis(
  company: string,
  hubspotDealId: string | null,
): Promise<{ dealId: string; dealAnalysisId: string } | null> {
  const persistence = getPersistenceProvider();
  const deal = await persistence.findDeal(
    hubspotDealId ? { hubspotDealId } : { companyKey: computeCompanyKey(company) },
  );
  if (!deal) {
    log.warn("signals: no stored deal for company, skipping persistence", { company });
    return null;
  }
  const analysis = await persistence.getLatestAnalysis(deal.id);
  if (!analysis) {
    log.warn("signals: no latest analysis for deal, skipping persistence", { dealId: deal.id });
    return null;
  }
  return { dealId: deal.id, dealAnalysisId: analysis.id };
}
