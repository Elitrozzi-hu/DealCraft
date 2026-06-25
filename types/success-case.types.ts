// Success cases (intel) — won/lost lookalike deals shown as evidence.

export type CompOutcome = "won" | "lost";

export interface SuccessCase {
  co: string;
  industry: string;
  deskless: number;
  size: number;
  wedge: string;
  cycle: number;
  result: CompOutcome;
  mrr: number;
  reason?: string;
}

/** A real success case sourced from HubSpot (Won or Red List stage). */
export interface HubSpotSuccessCase {
  id: string;
  name: string;
  industry: string | null;
  segment: string | null;
  stageLabel: string | null;
  amount: number | null;
}
