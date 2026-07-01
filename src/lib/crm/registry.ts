import { CRM_PROVIDER } from "@/lib/server/env";
import type { CrmProvider } from "@/lib/crm/types";
import { hubspotCrmProvider } from "@/lib/crm/providers/hubspot";
import { mockCrmProvider } from "@/lib/crm/providers/mock";

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
