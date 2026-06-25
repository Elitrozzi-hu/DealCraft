// Lead search (CRM) — resolve a CRM contact by email before analysis.

/**
 * Lead search request sent to `/api/leads/search`. The lead is resolved by
 * `email` only — the single search key.
 */
export interface LeadSearchRequest {
  email: string;
}

/**
 * A deal associated with a CRM contact, resolved at search time. The stage
 * *label* (not the numeric HubSpot stage id) is resolved at read time; vendor
 * fields are normalized to typed-or-null so the UI never sees a raw id.
 */
export interface LeadDeal {
  id: string;
  name: string | null; // dealname
  stageLabel: string | null; // dealstage → resolved label (never the id)
  amount: number | null; // amount
  industry: string | null; // industria_hu
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
  // Associated deals, resolved at search time (empty when the contact has none).
  deals: LeadDeal[];
}

export interface LeadSearchResult {
  provider: string;
  total: number;
  candidates: LeadCandidate[];
}
