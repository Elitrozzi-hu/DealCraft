import {
  generateObject,
  generateText,
  type ModelMessage,
  type ToolSet,
} from "ai";
import type { z } from "zod";

import { getModel, type LlmProvider } from "./registry.js";
import { GLADOS_API_URL, LLM_PROVIDER } from "../server/env.js";


export interface GenerationUsage {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  citations?: number;
  citationUrls?: string[];
}


export interface GenerationResponse {
  object?: unknown;
  text?: string;
  response: unknown;
  providerMetadata: unknown;
  usage: unknown;
}

export interface CommonOptions {
  provider?: LlmProvider;
  gladosToken?: string;
  model?: string;
  system?: string;
  prompt?: string;
  messages?: ModelMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  tools?: ToolSet;

  providerOptions?: Record<string, Record<string, unknown>>;
  onUsage?: (usage: GenerationUsage) => void;
  onResponse?: (raw: GenerationResponse) => void;
}

export async function generate(
  opts: CommonOptions & { schema?: undefined },
): Promise<string>;
export async function generate<T extends z.ZodType>(
  opts: CommonOptions & { schema: T },
): Promise<z.infer<T>>;
export async function generate<T extends z.ZodType>(
  opts: CommonOptions & { schema?: T },
): Promise<string | z.infer<T>> {
  if (opts.schema && opts.tools) {
    throw new Error(
      "generate(): `schema` and `tools` cannot be combined in one call — " +
        "run the tools (e.g. web search) call first, then a separate structured call.",
    );
  }

  const resolvedProvider = (opts.provider ?? LLM_PROVIDER ?? "openrouter") as string;
  if (resolvedProvider === "glados") {
    return callGlados(opts);
  }

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
    return object as z.infer<T>;
  }

  const { text, usage, response, providerMetadata } = await generateText({
    ...base,
    tools: opts.tools,
  } as Parameters<typeof generateText>[0]);
  reportUsage(opts.onUsage, response, usage, providerMetadata);
  opts.onResponse?.({ text, response, providerMetadata, usage });
  return text;
}


async function callGlados<T extends z.ZodType>(
  opts: CommonOptions & { schema?: T },
): Promise<string | z.infer<T>> {
  if (!opts.gladosToken) {
    throw Object.assign(
      new Error(
        "GLaDOS token required — call getGladosToken(req, res) in your BFF handler and pass the result as `gladosToken`.",
      ),
      { statusCode: 401 },
    );
  }
  if (!GLADOS_API_URL) throw new Error("GLADOS_API_URL is not set");

  type GladosMessage = { role: string; content: string };
  let messages: GladosMessage[];

  if (opts.messages && opts.messages.length > 0) {
    messages = opts.messages.flatMap((m): GladosMessage[] => {
      const content = typeof m.content === "string" ? m.content : "";
      return content !== undefined ? [{ role: m.role as string, content }] : [];
    });
  } else {
    messages = [];
    if (opts.system) messages.push({ role: "system", content: opts.system });
    if (opts.prompt) messages.push({ role: "user", content: opts.prompt });
  }

  // For structured calls, append a JSON instruction so GLaDOS returns parseable output
  if (opts.schema) {
    const sysIdx = messages.findIndex((m) => m.role === "system");
    const jsonInstruction =
      "Respond with ONLY valid JSON matching the required schema. No markdown code blocks, no explanation.";
    if (sysIdx >= 0) {
      messages[sysIdx] = {
        ...messages[sysIdx],
        content: messages[sysIdx].content + "\n\n" + jsonInstruction,
      };
    } else {
      messages.unshift({ role: "system", content: jsonInstruction });
    }
  }

  const gladosRes = await fetch(`${GLADOS_API_URL}/v1/public/calls`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.gladosToken}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!gladosRes.ok) {
    const detail = await gladosRes.json().catch(() => ({}));
    throw Object.assign(
      new Error(`GLaDOS responded ${gladosRes.status}`),
      { statusCode: gladosRes.status >= 500 ? 502 : gladosRes.status, detail },
    );
  }

  const data = await gladosRes.json() as {
    content: string;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const inputTokens = data.usage?.input_tokens;
  const outputTokens = data.usage?.output_tokens;
  opts.onUsage?.({
    model: "glados",
    inputTokens,
    outputTokens,
    totalTokens:
      inputTokens !== undefined && outputTokens !== undefined
        ? inputTokens + outputTokens
        : undefined,
  });
  opts.onResponse?.({ text: data.content, response: data, providerMetadata: {}, usage: data.usage });

  if (opts.schema) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.content);
    } catch {
      throw new Error(
        `GLaDOS returned non-JSON for structured generation: ${data.content.slice(0, 200)}`,
      );
    }
    return opts.schema.parse(parsed) as z.infer<T>;
  }

  return data.content;
}

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
