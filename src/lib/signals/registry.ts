import { SIGNALS_PROVIDER } from "../server/env.js";
import type { SignalsProvider } from "./types.js";
import { cassidySignalsProvider } from "./providers/cassidy.js";

// Signals provider registry. The single place that knows which providers exist.
// Golden rule: adding a provider = a new file + one line here.
const providers: Record<string, SignalsProvider> = {
  cassidy: cassidySignalsProvider,
};

/**
 * Resolve a signals provider by name.
 * @param name registry key; defaults to `SIGNALS_PROVIDER` env, then `cassidy`.
 */
export function getSignalsProvider(name?: string): SignalsProvider {
  const key = name ?? SIGNALS_PROVIDER ?? "cassidy";
  const provider = providers[key];
  if (!provider) {
    throw new Error(
      `Unknown signals provider "${key}". Known providers: ${Object.keys(providers).join(", ")}.`,
    );
  }
  return provider;
}
