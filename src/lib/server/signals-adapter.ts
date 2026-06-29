import { generate, type GenerationUsage } from "@/lib/llm/generate";
import type { LlmProvider } from "@/lib/llm/registry";
import { humandSignalsSchema } from "@/lib/llm/generations/company-signals/structured-output";
import { renderSignalsPrompt } from "@/lib/llm/generations/company-signals/prompt";
import { ENRICHMENT_LLM_PROVIDER } from "@/lib/server/env";
import { createLogger } from "@/lib/server/logger";
import type { SignalsResult } from "@/types";

const log = createLogger("signals");
export async function fetchSignals(
  company: string,
  domain: string,
): Promise<SignalsResult> {
  log.info("signals started", { company, domain });
  const t0 = Date.now();

  const plugin = { id: "web", engine: "exa", max_results: 10 };

  let usage: GenerationUsage | undefined;
  const result = await generate({
    provider: (ENRICHMENT_LLM_PROVIDER ?? "openrouter") as LlmProvider,
    schema: humandSignalsSchema,
    system: renderSignalsPrompt(company, domain),
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
