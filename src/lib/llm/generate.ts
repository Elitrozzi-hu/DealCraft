import {
  generateObject,
  generateText,
  type ModelMessage,
  type ToolSet,
} from "ai";
import type { z } from "zod";

import { getModel, type LlmProvider } from "./registry";

// The single LLM entry point. Every model call in the app flows through here,
// so swapping the provider/model (registry + env) swaps it everywhere.
//
// Hard rule: `schema` XOR `tools`. With a `schema` we run `generateObject`
// (structured, no tools); without one we run `generateText` (free text, tools
// allowed). Live web search can ride alongside a `schema` via `providerOptions`
// (e.g. OpenRouter's `web` plugin) — that path is orthogonal to `tools`.

/** Resolved model id + token usage from one completed generation. Token counts
 *  and `costUsd` are `undefined` when the provider doesn't report them (cost
 *  needs OpenRouter usage accounting enabled — `usage: { include: true }`). */
export interface GenerationUsage {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  /** End-to-end spend in USD, as billed by the provider. */
  costUsd?: number;
  /** Web-search citations the provider attached. `0` ⇒ search likely didn't run. */
  citations?: number;
  /** URLs of those citations, for spot-checking which sources were used. */
  citationUrls?: string[];
}

/** The complete, untyped result of one generation — for debugging/inspection.
 *  Surfaced via `onResponse` so a caller can log the full provider envelope
 *  (raw OpenRouter JSON, citations, cost) without the SDK types leaking out. */
export interface GenerationResponse {
  /** Parsed object (schema path); `undefined` on the free-text path. */
  object?: unknown;
  /** Generated text (free-text path); `undefined` on the schema path. */
  text?: string;
  /** Provider response envelope — `response.body` is the raw OpenRouter JSON
   *  (choices, annotations/citations, usage). */
  response: unknown;
  /** Provider-specific metadata (OpenRouter usage accounting + cost live here). */
  providerMetadata: unknown;
  /** Normalized token usage from the AI SDK. */
  usage: unknown;
}

export interface CommonOptions {
  /** Registry key; defaults to `LLM_PROVIDER` env, then `openrouter`. */
  provider?: LlmProvider;
  /** Vendor model id; defaults to the provider's own env default. */
  model?: string;
  system?: string;
  prompt?: string;
  messages?: ModelMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  /** Server/function tools for the free-text path. Forbidden with `schema`. */
  tools?: ToolSet;
  /**
   * Provider-specific options forwarded verbatim to the AI SDK call, e.g.
   * `{ openrouter: { plugins: [{ id: "web" }] } }` to enable live web search
   * alongside structured output in a single OpenRouter call. Orthogonal to
   * `tools`, so it is allowed with a `schema`.
   */
  providerOptions?: Record<string, Record<string, unknown>>;
  /** Called once after a successful call with the model id + token usage, so
   *  callers can log/meter spend without the SDK result leaking out of here. */
  onUsage?: (usage: GenerationUsage) => void;
  /** Called once after a successful call with the COMPLETE, untyped result
   *  (raw provider envelope included) — for debugging/inspection only. */
  onResponse?: (raw: GenerationResponse) => void;
}

/** Free-text generation (tools allowed). Returns the model's text. */
export async function generate(
  opts: CommonOptions & { schema?: undefined },
): Promise<string>;
/** Structured generation. Returns the zod-inferred object. */
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

/** OpenRouter reports spend at `providerMetadata.openrouter.usage.cost` (USD)
 *  when usage accounting is on. Read defensively — it's absent otherwise. */
function readCostUsd(providerMetadata: unknown): number | undefined {
  const cost = (
    providerMetadata as
      | { openrouter?: { usage?: { cost?: unknown } } }
      | undefined
  )?.openrouter?.usage?.cost;
  return typeof cost === "number" ? cost : undefined;
}

/** Pull web-search citation URLs from the raw OpenRouter body. `url_citation`
 *  annotations sit on `choices[].message.annotations` (they aren't surfaced on
 *  the typed `generateObject` result). An empty list ⇒ no sources came back. */
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
