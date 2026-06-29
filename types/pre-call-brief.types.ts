// Pre-call Brief — internal AE prep artifact: 2-3 prioritized, falsifiable
// value hypotheses (in Spanish), each with proof drawn verbatim from a
// comparable case. Detected pains are intentionally NOT an input (avoids
// circular inference).

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
  industry: string;
  region: string;
  headcount: string;
  stakeholders: PreCallStakeholder[];
  comparableCases: PreCallComparableCase[];
}

export type PreCallBriefResult = PreCallBrief;
