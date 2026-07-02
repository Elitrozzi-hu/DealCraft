// Scoring — the dealscore breakdown (parts, coverage, unlocked gates).

export interface ScorePart {
  /** Label of the score component. */
  k: string;
  /** 0..1 value. */
  v: number;
  /** 0..1 weight. */
  w: number;
}

export interface Score {
  total: number;
  parts: ScorePart[];
  coverage: number;
  dominantId: string | null;
  si: number;
  rolesUnlocked: boolean;
}
