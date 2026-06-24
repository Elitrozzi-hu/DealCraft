// Comparables (intel) — won/lost lookalike deals shown as evidence.

export type CompOutcome = "won" | "lost";

export interface Comparable {
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
