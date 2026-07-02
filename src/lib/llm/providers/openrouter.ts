import { generateObject, generateText } from "ai";
import type { z } from "zod";

import { getModel } from "../registry.js";
import type { CommonOptions, GenerationProvider } from "../types.js";

export const openrouterProvider: GenerationProvider = {
  name: "openrouter",
  async generate(opts: CommonOptions & { schema?: z.ZodType }): Promise<unknown> {
    const model = getModel(opts.provider, opts.model);
    const base = {
      model,
      system: opts.system,
      prompt: opts.prompt,
      messages: opts.messages,
      temperature: opts.temperature,
      maxOutputTokens: opts.maxOutputTokens,
      providerOptions: opts.providerOptions,
    };

    if (opts.schema) {
      const { object, usage, response, providerMetadata } = await generateObject({
        ...base,
        schema: opts.schema,
      } as Parameters<typeof generateObject>[0]);
      reportUsage(opts.onUsage, response, usage, providerMetadata);
      opts.onResponse?.({ object, response, providerMetadata, usage });
      return object;
    }

    const { text, usage, response, providerMetadata } = await generateText({
      ...base,
      tools: opts.tools,
    } as Parameters<typeof generateText>[0]);
    reportUsage(opts.onUsage, response, usage, providerMetadata);
    opts.onResponse?.({ text, response, providerMetadata, usage });
    return text;
  },
};

/** Fan a completed call's model + token usage (+ USD cost + citations) to `onUsage`. */
function reportUsage(
  onUsage: CommonOptions["onUsage"],
  response: { modelId: string; body?: unknown },
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number },
  providerMetadata: unknown,
): void {
  const citationUrls = readCitationUrls(response.body);
  onUsage?.({
    model: response.modelId,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    costUsd: readCostUsd(providerMetadata),
    citations: citationUrls.length,
    citationUrls,
  });
}

function readCostUsd(providerMetadata: unknown): number | undefined {
  const cost = (
    providerMetadata as
      | { openrouter?: { usage?: { cost?: unknown } } }
      | undefined
  )?.openrouter?.usage?.cost;
  return typeof cost === "number" ? cost : undefined;
}

function readCitationUrls(responseBody: unknown): string[] {
  const choices = (
    responseBody as
      | { choices?: Array<{ message?: { annotations?: unknown } }> }
      | undefined
  )?.choices;
  if (!Array.isArray(choices)) return [];
  const urls: string[] = [];
  for (const choice of choices) {
    const annotations = choice?.message?.annotations;
    if (!Array.isArray(annotations)) continue;
    for (const a of annotations) {
      const ann = a as { type?: unknown; url_citation?: { url?: unknown } };
      if (ann?.type === "url_citation" && typeof ann.url_citation?.url === "string") {
        urls.push(ann.url_citation.url);
      }
    }
  }
  return urls;
}
