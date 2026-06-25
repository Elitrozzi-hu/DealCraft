// Stakeholders — the buying-committee people on a deal.

export type Role =
  | "Champion"
  | "Decision Maker"
  | "Influencer"
  | "Economic Buyer"
  | "Blocker";

/** Where a stakeholder/pain datum came from. */
export type EvidenceSource = "call" | "firmographic" | "manual";

export interface Stakeholder {
  id: string;
  name: string;
  title: string;
  role: Role;
  /** 0..1 confidence. */
  conf: number;
  source: EvidenceSource;
  evidence: string;
  validated: boolean;
  /** Public LinkedIn profile URL, when the enrichment source provided one. The
   *  source link for a firmographically-identified person. */
  linkedinUrl?: string;
  /** Source page this person was found on (e.g. the company LinkedIn page), used
   *  as the link when there's no personal `linkedinUrl`. Absent when inferred. */
  sourceUrl?: string;
}

/** Draft payload for adding/editing a stakeholder from the UI. */
export interface StakeholderDraft {
  name: string;
  title: string;
  role: Role;
  validated: boolean;
}
