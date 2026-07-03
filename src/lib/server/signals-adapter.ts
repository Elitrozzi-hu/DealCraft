import { randomUUID } from "node:crypto";

import { generate, type GenerationUsage } from "../llm/generate.js";
import type { LlmProvider } from "../llm/registry.js";
import { humandSignalsSchema } from "../llm/generations/company-signals/structured-output.js";
import { renderSignalsPrompt } from "../llm/generations/company-signals/prompt.js";
import { computeCompanyKey } from "../persistence/company-key.js";
import { getPersistenceProvider } from "../persistence/registry.js";
import { ENRICHMENT_LLM_PROVIDER } from "./env.js";
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

  const plugin = { id: "web", engine: "exa", max_results: 10 };
  const provider = (ENRICHMENT_LLM_PROVIDER ?? "openrouter") as LlmProvider;
  const callId = randomUUID();

  let usage: GenerationUsage | undefined;
  const result = await generate({
    provider,
    schema: humandSignalsSchema,
    system: renderSignalsPrompt(company, domain, language),
    prompt: `Find recent buying signals for ${company} (${domain})`,
    providerOptions: {
      openrouter: { plugins: [plugin], usage: { include: true } },
    },
    onUsage: (u) => {
      usage = u;
    },
  });

  log.info("signals complete", {
    durationMs: Date.now() - t0,
    count: result.signals.length,
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

  const target = await resolveLatestAnalysis(company, hubspotDealId);

  if (target) {
    const persisted = await getPersistenceProvider().updateSignals(
      target.dealAnalysisId,
      result as SignalsResult,
      1,
    );
    if (!persisted) {
      log.warn("signals: stale write skipped (analysis no longer latest)", {
        dealAnalysisId: target.dealAnalysisId,
      });
    }
  }

  if (usage) {
    try {
      await getPersistenceProvider().insertLlmCall({
        callId,
        task: "company-signals",
        provider,
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

  return result as SignalsResult;
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
