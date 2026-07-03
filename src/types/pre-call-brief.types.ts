

import type { Language } from "./language.types";

export interface PreCallHypothesis {
  title: string;
  rationale: string;
  suggestedModule: string | null;
  proofCaseCompany: string | null;
  proofMetric: string | null;
  proofSourceUrl: string | null;
  discoveryQuestions: string[];
  confirms: string;
  discards: string;
}

export interface PreCallBrief {
  hypotheses: PreCallHypothesis[];
  contextQuestions: string[];
}

export interface PreCallComparableCase {
  company: string;
  industry: string;
  pains: string[];
  modules: string[];
  metrics: { value: string; label: string }[];
  quote: string | null;
  sourceUrl: string | null;
}

export interface PreCallStakeholder {
  name: string;
  title: string;
  role: string;
}

/** BFF request contract for `POST /api/pre-call-brief`. */
export interface PreCallBriefRequest {
  company: string;
  /** HubSpot deal id, when known — lets the BFF resolve the stored `deal_analysis`
   *  row the same way `/api/deals/search` does, instead of by company name alone. */
  hubspotDealId?: string | null;
  industry: string;
  region: string;
  headcount: string;
  stakeholders: PreCallStakeholder[];
  comparableCases: PreCallComparableCase[];
  language?: Language;
}

export type PreCallBriefResult = PreCallBrief;
