import {
  createOpenRouter,
  type OpenRouterProvider,
} from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

import { LLM_PROVIDER, OPENROUTER_API_KEY, OPENROUTER_MODEL } from "../server/env.js";
import type { GenerationProvider, LlmProvider } from "./types.js";
import { openrouterProvider as openrouterGenerationProvider } from "./providers/openrouter.js";
import { gladosProvider } from "./providers/glados.js";

export type { LlmProvider } from "./types.js";

let openrouterProvider: OpenRouterProvider | null = null;


export function getOpenRouterProvider(): OpenRouterProvider {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is not set; cannot build the OpenRouter provider.",
    );
  }
  openrouterProvider ??= createOpenRouter({ apiKey: OPENROUTER_API_KEY });
  return openrouterProvider;
}

export const providers = {
  openrouter: (model?: string) =>
    getOpenRouterProvider()(model ?? OPENROUTER_MODEL ?? ""),
} satisfies Record<string, (model?: string) => LanguageModel>;

/**
 * Resolve a `LanguageModel` for the requested provider/model.
 * @param name  registry key; defaults to `LLM_PROVIDER` env, then `openrouter`.
 * @param model vendor model id; defaults to the provider's own env default.
 */
export function getModel(name?: LlmProvider, model?: string): LanguageModel {
  const key = (name ?? LLM_PROVIDER ?? "openrouter") as string;
  if (!(key in providers)) {
    throw new Error(
      `Unknown LLM provider "${key}". Known providers: ${Object.keys(providers).join(", ")}.`,
    );
  }
  return providers[key as keyof typeof providers](model);
}

// Generation provider registry — resolves a full `generate()` implementation
// (not just a `LanguageModel`). Golden rule: adding a provider = a new file + one line here.
const generationProviders: Record<LlmProvider, GenerationProvider> = {
  openrouter: openrouterGenerationProvider,
  glados: gladosProvider,
};

/**
 * Resolve a generation provider by name.
 * @param name registry key; defaults to `LLM_PROVIDER` env, then `openrouter`.
 */
export function getGenerationProvider(name?: string): GenerationProvider {
  const key = name ?? LLM_PROVIDER ?? "openrouter";
  const provider = generationProviders[key as LlmProvider];
  if (!provider) {
    throw new Error(
      `Unknown LLM provider "${key}". Known providers: ${Object.keys(generationProviders).join(", ")}.`,
    );
  }
  return provider;
}
