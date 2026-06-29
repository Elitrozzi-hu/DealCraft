// Pains & solution graph — discovered pains mapped to Humand modules via taxonomy.

import type { EvidenceSource } from "./stakeholder.types";

/** The known taxonomy keys that map to a Humand module via the solution graph. */
export type Taxonomy =
  | "Comunicación interna"
  | "Onboarding / Capacitación"
  | "Clima / Engagement"
  | "Autogestión / Documentos"
  | "Reconocimiento"
  | "Seguridad / Compliance"
  | "Beneficios";

export interface Pain {
  id: string;
  label: string;
  /** A `Taxonomy` value, or a free-form label ("Otro (no mapeado)") with no module. */
  taxonomy: string;
  source: EvidenceSource;
  /** 0..1 confidence. */
  conf: number;
  evidence: string;
  /** Resolved Humand module, or `null` when the taxonomy has no catalogue entry. */
  module: string | null;
  validated: boolean;
  /** Source page backing this pain, when one exists (else it was inferred). */
  sourceUrl?: string;
}

/** Draft payload for adding a pain from the UI. */
export interface PainDraft {
  label: string;
  taxonomy: string;
  evidence: string;
}
