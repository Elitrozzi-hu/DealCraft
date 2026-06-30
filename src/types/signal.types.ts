import type { Language } from "./language.types";

export const SIGNAL_TYPES = [
  "new_people_leader",
  "m_and_a",
  "funding",
  "hiring_surge",
  "expansion",
  "hr_digital_transformation",
  "culture_program",
  "gptw",
  "restructuring",
  "labor_conflict",
  "esg_dei",
  "compliance_training",
  "turnover",
  "stack",
] as const;

export type SignalType = (typeof SIGNAL_TYPES)[number];

export interface SignalItem {
  tier: 1 | 2 | 3;
  type: SignalType;
  headline: string;
  date: string | null;
  summary: string;
  source_url: string;
  status: "verified" | "inferred";
  confidence: number;
}

export interface SignalsRequest {
  company: string;
  domain: string;
  language?: Language;
}

export interface SignalsResult {
  company: string;
  domain: string;
  signals: SignalItem[];
}
