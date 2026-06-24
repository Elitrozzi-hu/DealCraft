// Domain constants & pure stage/solution-graph helpers ported from `poc.jsx`.
// No React, no presentation (colors live in the UI layer as Tailwind tokens).

import type { Role, Segment, Stage, StageKey, Taxonomy } from "@/types";

// ---------------- stages (5) ----------------
export const STAGES: Stage[] = [
  {
    key: "lead",
    label: "Lead / early intro",
    short: "Lead",
    w: 0.45,
    tone: "early",
    sub: "Calificar fit y conseguir la primera reunión",
    confirms: "Firmografía inferida y personas detectadas — todo hipótesis.",
  },
  {
    key: "discovery",
    label: "Discovery",
    short: "Discovery",
    w: 0.7,
    tone: "early",
    sub: "Validar dolores con la operación",
    confirms: "Dolores reales validados en la primera reunión.",
  },
  {
    key: "champion",
    label: "Champion identified",
    short: "Champion",
    w: 0.9,
    tone: "mid",
    sub: "Asegurar un champion con poder de agenda",
    confirms: "Champion con relación + dolor dominante priorizado.",
  },
  {
    key: "md",
    label: "MD engaged",
    short: "MD",
    w: 1.0,
    tone: "late",
    sub: "Alinear Humand con las prioridades del decisor",
    confirms: "Decisor económico involucrado: presupuesto y MRR.",
  },
  {
    key: "procurement",
    label: "Procurement / close",
    short: "Close",
    w: 1.0,
    tone: "late",
    sub: "Pricing, legal y cierre",
    confirms: "Pricing final, legal y firmante.",
  },
];

export const stageIndex = (k: StageKey): number =>
  Math.max(0, STAGES.findIndex((s) => s.key === k));

export const stageObj = (k: StageKey): Stage =>
  STAGES.find((s) => s.key === k) ?? STAGES[0];

/**
 * Map a HubSpot `lifecycleStage` to a deal `StageKey`. HubSpot's lifecycle
 * vocabulary doesn't line up 1:1 with our sales pipeline; unknown/null → "lead".
 */
const LIFECYCLE_TO_STAGE: Record<string, StageKey> = {
  subscriber: "lead",
  lead: "lead",
  marketingqualifiedlead: "discovery",
  salesqualifiedlead: "discovery",
  opportunity: "champion",
  customer: "md",
  evangelist: "md",
};

export const lifecycleStageToStageKey = (
  stage: string | null | undefined,
): StageKey => LIFECYCLE_TO_STAGE[stage?.trim().toLowerCase() ?? ""] ?? "lead";

// ---------------- solution graph ----------------
export const SOLUTION_GRAPH: Record<Taxonomy, string> = {
  "Comunicación interna": "Comunicación (Feed + segmentación + acuse de lectura)",
  "Onboarding / Capacitación": "Onboarding journeys + Capacitaciones",
  "Clima / Engagement": "Encuestas de clima + pulse",
  "Autogestión / Documentos": "Documentos + firma digital + autogestión",
  Reconocimiento: "Reconocimientos + badges",
  "Seguridad / Compliance": "Comunicados obligatorios + acuse + checklist",
  Beneficios: "Beneficios + marketplace",
};

export const TAXONOMIES: Taxonomy[] = Object.keys(SOLUTION_GRAPH) as Taxonomy[];

/** Resolve a taxonomy label to a Humand module, or `null` when unmapped. */
export const resolveModule = (t: string): string | null =>
  (SOLUTION_GRAPH as Record<string, string>)[t] ?? null;

// ---------------- roles ----------------
export const ROLES: Role[] = [
  "Champion",
  "Decision Maker",
  "Influencer",
  "Economic Buyer",
  "Blocker",
];

// ---------------- pricing & segmentation defaults ----------------
/** Unit price per employee (USD) used for the MRR estimate. */
export const UNIT_PRICE = 4.5;
/** Volume discount factor applied to the MRR estimate. */
export const VOLUME_FACTOR = 0.85;

/** Derive a market segment from a headcount. */
export const segmentOf = (headcount: number): Segment =>
  headcount >= 1000 ? "Enterprise" : headcount >= 200 ? "Mid-Market" : "SMB";

/** Estimated possible MRR from a headcount (headcount × unit price × discount). */
export const estimateMRR = (headcount: number): number =>
  Math.round(headcount * UNIT_PRICE * VOLUME_FACTOR);
