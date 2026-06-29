// Firmographics & deal — the resolved company, its firmographics, and the
// deal-search BFF contract.

import type { Provenance, ProvenancedValue } from "./provenance.types";
import type { StageKey } from "./stage.types";
import type { Stakeholder } from "./stakeholder.types";
import type { Pain } from "./pain.types";
import type { LeadDeal } from "./lead.types";
import type { PublishedSuccessCase } from "./success-case.types";

export interface EntityCandidate {
  name: string;
  note: string;
}

export interface EntityResolution {
  resolved: string;
  confidence: number;
  candidates: EntityCandidate[];
}

/** How a detected technology relates to Humand's offering. Single source of
 *  truth — the enrichment zod enum (`result-schema.ts`) infers from this. */
export const TECH_KINDS = ["desplazar", "integrar", "coexistir"] as const;
export type TechKind = (typeof TECH_KINDS)[number];

export interface TechItem {
  t: string;
  kind: TechKind;
  /** Per-tool provenance (source link + status), when the provider supplies it. */
  prov?: Provenance;
}

export interface DesklessInfo {
  value: string;
  detail: string;
  prov: Provenance;
}

export interface Firmographics {
  summary: ProvenancedValue;
  industry: ProvenancedValue;
  /** Provenance for the region value (the value itself lives on `Deal.region`). */
  regionProv: Provenance;
  /** Total headcount value; its provenance lives in `headcountProv`. */
  headcount: number;
  headcountProv: Provenance;
  deskless: DesklessInfo;
  tech: TechItem[];
  techProv: Provenance;
}

export interface HubspotSnapshot {
  /** Resolved deal-stage *label* from HubSpot (never the numeric id); "" when absent. */
  dealStage: string;
  /** Deal amount from HubSpot; null when the deal has none. */
  amount: number | null;
  lastActivity: string;
  notes: string;
  /** Segment from HubSpot `segment_v2`; null when absent. Overrides computed segment in UI. */
  segment: string | null;
  /** Third-party systems the client has integrated (`integraciones`); null when absent. */
  integraciones: string | null;
}

export interface Deal {
  entity: EntityResolution;
  stage: StageKey;
  region: string;
  firmographics: Firmographics;
  hubspot: HubspotSnapshot;
}

export type Segment = "Enterprise" | "Mid-Market" | "SMB";

/** Header-level view of the deal company, derived from the deal + query. */
export interface DealMeta {
  name: string;
  industry: string;
  region: string;
  deskless: string;
  headcount: number;
  segment: Segment;
  website: string;
  /** True when headcount sources disagree and the AE must resolve it. */
  headcountConflict: boolean;
}

// --- BFF contract ---

export interface DealSearchRequest {
  name: string;
  website?: string;
  email?: string;
  // CRM-resolved fields forwarded from the selected HubSpot lead. They feed the
  // enrichment webhook (Classidy) and the deal-stage mapping.
  jobTitle?: string;
  companyName?: string;
  companyDomain?: string;
  contactEmail?: string;
  /** HubSpot `lifecycleStage`, mapped server-side to a `StageKey`. */
  lifecycleStage?: string;
  /** The deal chosen in the selection step, resolved once at search time. Its
   *  snapshot (stage label, amount, industry) rides the request so the analysis
   *  needs no second HubSpot call and persists nothing. */
  deal?: LeadDeal;
  /** Enrichment provider registry key to use for this request (plug-and-play
   *  from the client): `classidy` | `llm-websearch` | `mock`. Omit to use the
   *  `ENRICHMENT_PROVIDER` env default. Unknown key → 400. */
  enrichmentProvider?: string;
  /** When true, the response includes the provider's raw API responses under
   *  `_meta.raw`. Intended for benchmark scripts only — not for production UI. */
  benchmark?: boolean;
}

export interface DealSearchResult {
  resolvedName: string;
  coldStart: boolean;
  deal: Deal;
  stakeholders: Stakeholder[];
  pains: Pain[];
  successCases: PublishedSuccessCase[];
}
