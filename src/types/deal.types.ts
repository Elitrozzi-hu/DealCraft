

import type { Language } from "./language.types";
import type { Provenance, ProvenancedValue } from "./provenance.types";
import type { StageKey } from "./stage.types";
import type { Stakeholder } from "./stakeholder.types";
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
  regionProv: Provenance;
  headcount: number;
  headcountProv: Provenance;
  deskless: DesklessInfo;
  tech: TechItem[];
  techProv: Provenance;
}

export interface HubspotSnapshot {
  dealStage: string;
  amount: number | null;
  lastActivity: string;
  notes: string;
  segment: string | null;
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

export interface DealMeta {
  name: string;
  industry: string;
  region: string;
  deskless: string;
  headcount: number;
  segment: Segment;
  website: string;
  headcountConflict: boolean;
}

// --- BFF contract ---

export interface DealSearchRequest {
  name: string;
  website?: string;
  email?: string;
  jobTitle?: string;
  companyName?: string;
  companyDomain?: string;
  contactEmail?: string;
  lifecycleStage?: string;
  deal?: LeadDeal;
  enrichmentProvider?: string;
  benchmark?: boolean;
  language?: Language;
}

export interface DealSearchResult {
  resolvedName: string;
  coldStart: boolean;
  deal: Deal;
  stakeholders: Stakeholder[];
  successCases: PublishedSuccessCase[];
}
