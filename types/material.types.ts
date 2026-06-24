// Materials — client-facing & internal artifacts, and the materials BFF contract.

import type { Pain } from "./pain.types";
import type { Stakeholder } from "./stakeholder.types";

export type MaterialKey = "pres" | "prop" | "pre" | "post" | "play";

export type MaterialTagTone = "ok" | "inferred" | "info" | "cold";

export interface MaterialTag {
  label: string;
  tone: MaterialTagTone;
}

/** A renderable block inside a material preview. Structured (not JSX) so the
 *  artifact can come from the BFF/LLM step without leaking presentation. */
export type MaterialBlock =
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "item"; text: string }
  | { type: "gate"; ok: boolean; message: string }
  | { type: "empty"; text: string }
  | { type: "pricing"; mrr: number; confirmed: boolean; hidden: boolean };

export interface Material {
  key: MaterialKey;
  title: string;
  sub: string;
  /** Client-facing materials apply provenance gating; internal ones do not. */
  clientFacing: boolean;
  tag: MaterialTag;
  blocks: MaterialBlock[];
}

// --- BFF contract ---

export interface MaterialsRequest {
  companyName: string;
  pains: Pain[];
  stakeholders: Stakeholder[];
  includePricing: boolean;
  mrr: number;
  mrrConfirmed: boolean;
}

export interface MaterialsResult {
  materials: Material[];
}
