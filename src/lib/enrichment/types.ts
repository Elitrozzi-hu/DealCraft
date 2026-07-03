

import type { Language } from "../../types/index.js";

import type { LlmUsageEntry } from "../llm/types.js";
import type { NormalizedEnrichment } from "./result-schema.js";


export interface EnrichmentInput {
  email?: string;
  domain?: string;
  fullName?: string;
  jobTitle?: string;
  companyName?: string;
  language?: Language;
}

export interface EnrichmentResult {
  provider: string;
  data: NormalizedEnrichment;
  raw?: unknown;
  meta?: Record<string, unknown>;
  usage: LlmUsageEntry[];
}

export interface EnrichmentProvider<Options = unknown> {
  readonly name: string;
  enrich(input: EnrichmentInput, options?: Options): Promise<EnrichmentResult>;
}
