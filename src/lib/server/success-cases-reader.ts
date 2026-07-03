import type { PublishedSuccessCase } from "../../types/index.js";
import { getPersistenceProvider } from "../persistence/registry.js";

export async function getSuccessCasesByIndustry(
  industry: string | null,
): Promise<PublishedSuccessCase[]> {
  return getPersistenceProvider().getSuccessCasesByIndustry(industry);
}

export async function upsertSuccessCase(record: PublishedSuccessCase): Promise<void> {
  return getPersistenceProvider().upsertSuccessCase(record);
}
