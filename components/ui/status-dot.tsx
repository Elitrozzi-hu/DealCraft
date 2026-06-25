import type { ProvenanceStatus } from "@/types";

// Single source of truth for the validated / inferred / cold visual language,
// shared by ProvenanceBadge, ProvenanceLegend, and EmptyState so the three states
// read identically everywhere. The dot is a moon phase: a full disc means we have
// the whole datum (validated), a half disc means we inferred part of it, an empty
// ring means there's no data yet (cold). Rendered as SVG rather than the unicode
// ● ◐ ○ because the half-moon glyph renders inconsistently across fonts/OSes.

export const STATUS_META: Record<
  ProvenanceStatus,
  { word: string; desc: string; text: string; soft: string; badge: string }
> = {
  validated: {
    word: "validado",
    desc: "Verificado en una fuente con URL.",
    text: "text-validated",
    soft: "bg-validated-soft",
    badge: "bg-validated-soft text-validated border-validated/20",
  },
  inferred: {
    word: "inferido",
    desc: "Estimado por benchmarks o señales, sin fuente directa.",
    text: "text-inferred",
    soft: "bg-inferred-soft",
    badge: "bg-inferred-soft text-inferred border-inferred/20",
  },
  cold: {
    word: "sin dato",
    desc: "No encontramos el dato — queda marcado para validar.",
    text: "text-cold",
    soft: "bg-cold-soft",
    badge: "bg-cold-soft text-cold border-cold/20",
  },
};

export interface StatusDotProps {
  status: ProvenanceStatus;
  /** Square px size of the glyph. */
  size?: number;
  className?: string;
}

/** A moon-phase glyph for a provenance status. Inherits the surrounding text
 *  color via `currentColor`, so callers tint it by setting `text-*`. */
export function StatusDot({ status, size = 10, className }: StatusDotProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    className: `shrink-0${className ? ` ${className}` : ""}`,
  } as const;

  if (status === "validated") {
    // Full moon — the whole datum is verified.
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="11" fill="currentColor" />
      </svg>
    );
  }

  if (status === "inferred") {
    // Half moon — a ring with the right half filled.
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M12 3.5 A8.5 8.5 0 0 1 12 20.5 Z" fill="currentColor" />
      </svg>
    );
  }

  // New moon — an empty ring, no data behind it.
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
