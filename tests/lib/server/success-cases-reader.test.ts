import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PublishedSuccessCase } from "@/types";

const CASE_ES_ONLY: PublishedSuccessCase = {
  id: "case-1",
  slug: "case-1",
  company: "Acme",
  country: ["Argentina"],
  users: 100,
  link_web: null,
  link_youtube: null,
  link_video: null,
  link_doc: null,
  quote_author: null,
  content: {
    es: {
      industry: "Farmacéutica",
      tagline: null,
      description: null,
      pains: [],
      solution_narrative: null,
      modules: [],
      metrics: [],
      quote: null,
      quote_author_role: null,
      company_description: null,
    },
    en: null,
  },
  synced_at: "2026-01-01T00:00:00.000Z",
};

const CASE_WITH_EN: PublishedSuccessCase = {
  ...CASE_ES_ONLY,
  id: "case-2",
  slug: "case-2",
  content: {
    es: { ...CASE_ES_ONLY.content.es, industry: "Retail" },
    en: { ...CASE_ES_ONLY.content.es, industry: "Retail Trade" },
  },
};

// Force the `mock` persistence provider for this file, matching the parent
// plan's Task 23: verify success-cases-reader.ts's behavior once it's
// provider-backed instead of `fs.readFileSync`-backed.
async function loadReaderWithMockProvider() {
  vi.resetModules();
  vi.stubEnv("PERSISTENCE_PROVIDER", "mock");
  const { getPersistenceProvider } = await import("@/lib/persistence/registry");
  const reader = await import("@/lib/server/success-cases-reader");
  const provider = getPersistenceProvider();
  await provider.upsertSuccessCase(CASE_ES_ONLY);
  await provider.upsertSuccessCase(CASE_WITH_EN);
  return reader;
}

describe("success-cases-reader (mock persistence provider)", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("matches case-insensitively and bidirectionally on the `es` industry", async () => {
    const reader = await loadReaderWithMockProvider();
    const bySubstring = await reader.getSuccessCasesByIndustry("farmac");
    expect(bySubstring.map((c) => c.id)).toEqual(["case-1"]);

    const superstring = await reader.getSuccessCasesByIndustry("Farmacéutica del Sur");
    expect(superstring.map((c) => c.id)).toEqual(["case-1"]);
  });

  it("also matches against the `en` industry when present", async () => {
    const reader = await loadReaderWithMockProvider();
    const result = await reader.getSuccessCasesByIndustry("retail trade");
    expect(result.map((c) => c.id)).toEqual(["case-2"]);
  });

  it("returns an empty array for a null/blank industry", async () => {
    const reader = await loadReaderWithMockProvider();
    expect(await reader.getSuccessCasesByIndustry(null)).toEqual([]);
    expect(await reader.getSuccessCasesByIndustry("   ")).toEqual([]);
  });

  it("upsertSuccessCase round-trips through the provider", async () => {
    const reader = await loadReaderWithMockProvider();
    const updated: PublishedSuccessCase = {
      ...CASE_ES_ONLY,
      content: { ...CASE_ES_ONLY.content, es: { ...CASE_ES_ONLY.content.es, industry: "Salud" } },
    };
    await reader.upsertSuccessCase(updated);
    const result = await reader.getSuccessCasesByIndustry("salud");
    expect(result.map((c) => c.id)).toEqual(["case-1"]);
  });
});
