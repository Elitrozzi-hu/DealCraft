import { randomUUID } from "node:crypto";

import { generate, type GenerationUsage } from "../llm/generate.js";
import { preCallBriefSchema } from "../llm/generations/pre-call-brief/structured-output.js";
import { renderPreCallBriefPrompt } from "../llm/generations/pre-call-brief/prompt.js";
import { computeCompanyKey } from "../persistence/company-key.js";
import { getPersistenceProvider } from "../persistence/registry.js";
import { createLogger } from "./logger.js";
import {
  PRE_CALL_BRIEF_ATTRIBUTION_TAG,
  PRE_CALL_BRIEF_PROVIDER,
  PRE_CALL_BRIEF_TIER,
} from "../constants.js";
import type { PreCallBriefRequest, PreCallBriefResult } from "../../types/index.js";

const log = createLogger("pre-call-brief");

export async function generatePreCallBrief(
  req: PreCallBriefRequest,
  gladosToken?: string,
): Promise<PreCallBriefResult> {
  log.info("pre-call-brief started", {
    company: req.company,
    comparableCases: req.comparableCases.length,
    stakeholders: req.stakeholders.length,
  });
  const t0 = Date.now();
  const callId = randomUUID();

  let usage: GenerationUsage | undefined;
  const result = await generate({
    schema: preCallBriefSchema,
    system: renderPreCallBriefPrompt(req),
    prompt: "",
    provider: PRE_CALL_BRIEF_PROVIDER,
    tier: PRE_CALL_BRIEF_TIER,
    attributionTag: PRE_CALL_BRIEF_ATTRIBUTION_TAG,
    gladosToken,
    onUsage: (u) => {
      usage = u;
    },
  });

  log.info("pre-call-brief complete", {
    durationMs: Date.now() - t0,
    hypotheses: result.hypotheses.length,
    provider: usage?.provider,
    model: usage?.model,
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
    totalTokens: usage?.totalTokens,
    costUsd: usage?.costUsd != null ? Number(usage.costUsd.toFixed(4)) : undefined,
  });

  const target = await resolveLatestAnalysis(req.company, req.hubspotDealId ?? null);

  if (target) {
    const persisted = await getPersistenceProvider().updatePreCallBrief(
      target.dealAnalysisId,
      result as PreCallBriefResult,
      1,
    );
    if (!persisted) {
      log.warn("pre-call-brief: stale write skipped (analysis no longer latest)", {
        dealAnalysisId: target.dealAnalysisId,
      });
    }
  }

  if (usage) {
    try {
      await getPersistenceProvider().insertLlmCall({
        callId,
        task: "pre-call-brief",
        provider: usage.provider ?? PRE_CALL_BRIEF_PROVIDER,
        model: usage.model,
        inputTokens: usage.inputTokens ?? null,
        outputTokens: usage.outputTokens ?? null,
        totalTokens: usage.totalTokens ?? null,
        costUsd: usage.costUsd ?? null,
        dealId: target?.dealId ?? null,
        dealAnalysisId: target?.dealAnalysisId ?? null,
      });
    } catch (err) {
      log.warn("insertLlmCall failed, continuing", {
        callId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result as PreCallBriefResult;
}

/** Resolve the company's `deal`/latest `deal_analysis` ids by `company_key`,
 *  shared between the brief content write and the `llm_call` cost-attribution
 *  insert so both land on the same analysis version. Same stale/missing-
 *  analysis tolerance as `signals-adapter.ts`'s equivalent — a skipped write
 *  is logged, never thrown; the AE still sees the freshly generated brief. */
export async function resolveLatestAnalysis(
  company: string,
  hubspotDealId: string | null,
): Promise<{ dealId: string; dealAnalysisId: string } | null> {
  const persistence = getPersistenceProvider();
  const deal = await persistence.findDeal(
    hubspotDealId ? { hubspotDealId } : { companyKey: computeCompanyKey(company) },
  );
  if (!deal) {
    log.warn("pre-call-brief: no stored deal for company, skipping persistence", { company });
    return null;
  }
  const analysis = await persistence.getLatestAnalysis(deal.id);
  if (!analysis) {
    log.warn("pre-call-brief: no latest analysis for deal, skipping persistence", {
      dealId: deal.id,
    });
    return null;
  }
  return { dealId: deal.id, dealAnalysisId: analysis.id };
}
