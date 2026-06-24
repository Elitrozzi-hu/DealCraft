// Lead search (CRM) — resolve a CRM contact by email before analysis.

/**
 * Lead search request sent to `/api/leads/search`. The lead is resolved by
 * `email` only — the single search key.
 */
export interface LeadSearchRequest {
  email: string;
}

/**
 * A single CRM contact candidate; vendor fields normalized to string-or-null.
 * Carries the curated HubSpot Contacts property set kept per search.
 */
export interface LeadCandidate {
  id: string;
  // Identity
  fullName: string | null; // hs_full_name_or_email
  jobTitle: string | null; // jobtitle
  contactEmail: string | null; // email
  // Company
  companyName: string | null; // company
  companyDomain: string | null; // hs_email_domain
  // Location
  region: string | null; // region
  state: string | null; // state
  country: string | null; // country
  zip: string | null; // zip
  // Sales signals
  lifecycleStage: string | null; // lifecyclestage
  pipeline: string | null; // hs_pipeline
  scoringTier: string | null; // hs_predictivescoringtier
  predictiveScore: string | null; // hs_predictivecontactscore_v2
}

export interface LeadSearchResult {
  provider: string;
  total: number;
  candidates: LeadCandidate[];
}
