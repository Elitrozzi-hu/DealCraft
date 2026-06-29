// Stages — the deal lifecycle keys and their display/scoring metadata.

export type StageKey = "lead" | "discovery" | "champion" | "md" | "procurement";

export type StageTone = "early" | "mid" | "late";

export interface Stage {
  key: StageKey;
  label: string;
  short: string;
  /** Stage weight used by the scoring math. */
  w: number;
  tone: StageTone;
  sub: string;
  confirms: string;
}
