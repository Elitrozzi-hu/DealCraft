import "server-only";

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
// allowed). Web search + structured output is therefore two calls, never one.

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
  };

  if (opts.schema) {
    const { object } = await generateObject({
      ...base,
      schema: opts.schema,
    } as Parameters<typeof generateObject>[0]);
    return object as z.infer<T>;
  }

  const { text } = await generateText({
    ...base,
    tools: opts.tools,
  } as Parameters<typeof generateText>[0]);
  return text;
}
