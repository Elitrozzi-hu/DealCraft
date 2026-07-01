import { CRM_PROVIDER } from "../server/env.js";
import type { CrmProvider } from "./types.js";
import { hubspotCrmProvider } from "./providers/hubspot.js";
import { mockCrmProvider } from "./providers/mock.js";

// CRM provider registry. The single place that knows which providers exist.
// Golden rule: adding a provider = a new file + one line here.
const providers: Record<string, CrmProvider> = {
  hubspot: hubspotCrmProvider,
  mock: mockCrmProvider,
};

/**
 * Resolve a CRM provider by name.
 * @param name registry key; defaults to `CRM_PROVIDER` env, then `hubspot`.
 */
export function getCrmProvider(name?: string): CrmProvider {
  const key = name ?? CRM_PROVIDER ?? "hubspot";
  const provider = providers[key];
  if (!provider) {
    throw new Error(
      `Unknown CRM provider "${key}". Known providers: ${Object.keys(providers).join(", ")}.`,
    );
  }
  return provider;
}
