
import type { Language, Role, Segment, Stage, StageKey } from "@/types";

export const LANGUAGES: readonly Language[] = ["es", "en"];
export const DEFAULT_LANGUAGE: Language = "es";
export const LANGUAGE_STORAGE_KEY = "dealcraft.lang";

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

export const ROLES: Role[] = [
  "Champion",
  "Decision Maker",
  "Influencer",
  "Economic Buyer",
  "Blocker",
];

/** Derive a market segment from a headcount. */
export const segmentOf = (headcount: number): Segment =>
  headcount >= 1000 ? "Enterprise" : headcount >= 200 ? "Mid-Market" : "SMB";

/** Pre-call-brief always calls GLaDOS' tiny tier, regardless of `LLM_PROVIDER`. */
export const PRE_CALL_BRIEF_PROVIDER = "glados" as const;
export const PRE_CALL_BRIEF_TIER = "tiny" as const;
export const PRE_CALL_BRIEF_ATTRIBUTION_TAG = "pre-call-brief:generate" as const;
