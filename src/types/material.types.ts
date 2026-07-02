

import type { Stakeholder } from "./stakeholder.types";

export type MaterialKey = "pres" | "pre" | "post";

export type MaterialTagTone = "ok" | "inferred" | "info" | "cold";

export interface MaterialTag {
  label: string;
  tone: MaterialTagTone;
}

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
  clientFacing: boolean;
  tag: MaterialTag;
  blocks: MaterialBlock[];
}


export interface MaterialsRequest {
  companyName: string;
  stakeholders: Stakeholder[];
  includePricing: boolean;
  mrr: number;
  mrrConfirmed: boolean;
}

export interface MaterialsResult {
  materials: Material[];
}
