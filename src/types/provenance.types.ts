// Provenance — the cross-cutting concern: every datum carries source · confidence,
// and separates inferred from validated from cold-start.

export type ProvenanceStatus = "validated" | "inferred" | "cold";

export interface Provenance {
  /** Human-readable origin, e.g. "HubSpot", "Web + Clearbit". */
  source: string;
  /** Nature of the datum, e.g. "declarado", "inferido", "conflicto", "curado". */
  sourceType: string;
  /** 0..1 confidence. */
  confidence: number;
  status: ProvenanceStatus;
  /** Real, resolvable source URL when one genuinely exists (e.g. a LinkedIn
   *  profile). Absent when the source is only a name with no linkable origin —
   *  we never fabricate a destination the data did not provide. */
  url?: string;
}

/** A string value paired with its provenance. */
export interface ProvenancedValue {
  value: string;
  prov: Provenance;
}
