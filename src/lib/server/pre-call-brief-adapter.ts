import { generate, type GenerationUsage } from "../llm/generate.js";
import { preCallBriefSchema } from "../llm/generations/pre-call-brief/structured-output.js";
import { renderPreCallBriefPrompt } from "../llm/generations/pre-call-brief/prompt.js";
import { createLogger } from "./logger.js";
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

  let usage: GenerationUsage | undefined;
  const result = await generate({
    schema: preCallBriefSchema,
    system: renderPreCallBriefPrompt(req),
    prompt: "",
    gladosToken,
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
