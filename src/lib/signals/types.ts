import type { Language, SignalsResult } from "../../types/index.js";
import type { LlmUsageEntry } from "../llm/types.js";

export interface SignalsInput {
  company: string;
  domain: string;
  language: Language;
}

export interface SignalsProviderResult {
  data: SignalsResult;
  usage: LlmUsageEntry[];
}

export interface SignalsProvider {
  readonly name: string;
  fetch(input: SignalsInput): Promise<SignalsProviderResult>;
}
