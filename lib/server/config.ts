import "server-only";

import {
  CRM_PROVIDER,
  ENRICHMENT_PROVIDER,
  LLM_PROVIDER,
} from "./env";

// Provider-agnostic backend config seam. Real provider credentials
// (HubSpot / Lusha / web-search / LLM) come from `env.ts` (the single source
// of truth) — NEVER read from the client. Providers are not locked in yet
// (see PLAN), so this stays generic behind a TODO.

export interface ProviderConfig {
  enrichmentProvider: string | null;
  crmProvider: string | null;
  llmProvider: string | null;
}

export function getProviderConfig(): ProviderConfig {
  return {
    enrichmentProvider: ENRICHMENT_PROVIDER ?? null,
    crmProvider: CRM_PROVIDER ?? null,
    llmProvider: LLM_PROVIDER ?? null,
  };
}
