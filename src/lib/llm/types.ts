import type { ModelMessage, ToolSet } from "ai";
import type { z } from "zod";

/** Registry keys accepted by `getGenerationProvider()`. */
export type LlmProvider = "openrouter" | "glados";

export interface GenerationUsage {
  model: string;
  provider?: string;
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
  tier?: string;
  attributionTag?: string;

  providerOptions?: Record<string, Record<string, unknown>>;
  onUsage?: (usage: GenerationUsage) => void;
  onResponse?: (raw: GenerationResponse) => void;
}

/** One LLM provider's implementation of `generate()`. */
export interface GenerationProvider {
  readonly name: string;
  generate(opts: CommonOptions & { schema?: z.ZodType }): Promise<unknown>;
}
