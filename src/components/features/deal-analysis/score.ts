// Score → Tailwind color class helpers (presentation only). Mirrors the PoC
// `scoreColor` thresholds: ≥70 validated, ≥45 inferred, else risk.

export function scoreTextClass(score: number): string {
  return score >= 70
    ? "text-validated"
    : score >= 45
      ? "text-inferred"
      : "text-risk";
}
