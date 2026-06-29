import { generate, type GenerationUsage } from "@/lib/llm/generate";
import { preCallBriefSchema } from "@/lib/llm/generations/pre-call-brief/structured-output";
import { renderPreCallBriefPrompt } from "@/lib/llm/generations/pre-call-brief/prompt";
import { createLogger } from "@/lib/server/logger";
import type { PreCallBriefRequest, PreCallBriefResult } from "@/types";

const log = createLogger("pre-call-brief");

export async function generatePreCallBrief(
  req: PreCallBriefRequest,
): Promise<PreCallBriefResult> {
  log.info("pre-call-brief started", {
    company: req.company,
    comparableCases: req.comparableCases.length,
    stakeholders: req.stakeholders.length,
  });
  const t0 = Date.now();

  let usage: GenerationUsage | undefined;
  const result = await generate({
    provider: "openrouter",
    schema: preCallBriefSchema,
    system: renderPreCallBriefPrompt(req),
    prompt: "",
    onUsage: (u) => {
      usage = u;
    },
  });

  log.info("pre-call-brief complete", {
    durationMs: Date.now() - t0,
    hypotheses: result.hypotheses.length,
    model: usage?.model,
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
    totalTokens: usage?.totalTokens,
    costUsd: usage?.costUsd != null ? Number(usage.costUsd.toFixed(4)) : undefined,
  });

  return result as PreCallBriefResult;
}
