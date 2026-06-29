import {
  createOpenRouter,
  type OpenRouterProvider,
} from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

import { LLM_PROVIDER, OPENROUTER_API_KEY, OPENROUTER_MODEL } from "@/lib/server/env";

// LLM provider registry. The single place that knows which concrete vendors
// exist and how to build a model from each. Consumers depend on `getModel`
// (and `generate`), never on a vendor SDK directly.
//
// Golden rule: adding a provider = a new factory entry below + (if it needs a
// shared client) its own accessor. Nothing else in the app changes.

// --- OpenRouter -----------------------------------------------------------
// Memoized provider instance so the API key is read once and the same client
// is reused (its `.tools.webSearch` factory is also consumed by the
// llm-websearch enrichment provider — the only place allowed to know the
// OpenRouter web-search contract).
let openrouterProvider: OpenRouterProvider | null = null;

/** The shared OpenRouter provider instance. Throws if the key is missing. */
export function getOpenRouterProvider(): OpenRouterProvider {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is not set; cannot build the OpenRouter provider.",
    );
  }
  openrouterProvider ??= createOpenRouter({ apiKey: OPENROUTER_API_KEY });
  return openrouterProvider;
}

// --- Registry -------------------------------------------------------------
// `satisfies` keeps each entry type-checked while preserving the literal keys
// for `LlmProvider`. Adding `anthropic` later is one line here.
export const providers = {
  openrouter: (model?: string) =>
    getOpenRouterProvider()(model ?? OPENROUTER_MODEL ?? ""),
} satisfies Record<string, (model?: string) => LanguageModel>;

export type LlmProvider = keyof typeof providers;

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
  return providers[key as LlmProvider](model);
}
