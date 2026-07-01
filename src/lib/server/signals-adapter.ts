import { generate, type GenerationUsage } from "../llm/generate.js";
import type { LlmProvider } from "../llm/registry.js";
import { humandSignalsSchema } from "../llm/generations/company-signals/structured-output.js";
import { renderSignalsPrompt } from "../llm/generations/company-signals/prompt.js";
import { ENRICHMENT_LLM_PROVIDER } from "./env.js";
import { createLogger } from "./logger.js";
import type { Language, SignalsResult } from "../../types/index.js";

const log = createLogger("signals");
export async function fetchSignals(
  company: string,
  domain: string,
  language: Language = "es",
): Promise<SignalsResult> {
  log.info("signals started", { company, domain });
  const t0 = Date.now();

  const plugin = { id: "web", engine: "exa", max_results: 10 };

  let usage: GenerationUsage | undefined;
  const result = await generate({
    provider: (ENRICHMENT_LLM_PROVIDER ?? "openrouter") as LlmProvider,
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

  return result as SignalsResult;
}
