// The shared CRM abstraction. Consumers (routes) depend only on these types and
// the registry — never on a concrete provider. Every provider normalizes its
// vendor-specific response into one `LeadSearchResult` shape (`@/types`).

import type { HubSpotSuccessCase, LeadSearchResult } from "@/types";

/**
 * Normalized, server-side lead-search input. `email` is the only search key
 * (decision: "siempre buscamos el lead por su email").
 */
export interface LeadSearchInput {
  email: string;
}

/** Strategy interface implemented by every CRM provider. */
export interface CrmProvider {
  readonly name: string;
  searchLeads(input: LeadSearchInput): Promise<LeadSearchResult>;
  /** Optional: fetch Won/Red-List deals matching the given industry and segment. */
  searchSuccessCases?(input: {
    industry: string | null;
    segment: string | null;
  }): Promise<HubSpotSuccessCase[]>;
}
