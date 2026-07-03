import { PERSISTENCE_PROVIDER } from "../server/env.js";
import type { PersistenceProvider } from "./types.js";
import { supabasePersistenceProvider } from "./providers/supabase.js";
import { mockPersistenceProvider } from "./providers/mock.js";

// Persistence provider registry. The single place that knows which providers
// exist. Golden rule: adding a provider = a new file + one line here.
const providers: Record<string, PersistenceProvider> = {
  supabase: supabasePersistenceProvider,
  mock: mockPersistenceProvider,
};

/**
 * Resolve a persistence provider by name.
 * @param name registry key; defaults to `PERSISTENCE_PROVIDER` env, then `supabase`.
 */
export function getPersistenceProvider(name?: string): PersistenceProvider {
  const key = name ?? PERSISTENCE_PROVIDER ?? "supabase";
  const provider = providers[key];
  if (!provider) {
    throw new Error(
      `Unknown persistence provider "${key}". Known providers: ${Object.keys(providers).join(", ")}.`,
    );
  }
  return provider;
}
