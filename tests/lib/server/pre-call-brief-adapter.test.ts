import { afterEach, describe, expect, it, vi } from "vitest";

import type { DealSearchResult } from "@/types";
import { MOCK_DEAL } from "@/lib/fixtures";

// Force the `mock` persistence provider (no DB), then dynamically re-import
// both the adapter under test and the persistence registry fresh per test so
// the in-memory store never leaks across cases.
async function loadAdapter() {
  vi.resetModules();
  vi.stubEnv("PERSISTENCE_PROVIDER", "mock");
  const adapter = await import("@/lib/server/pre-call-brief-adapter");
  const { getPersistenceProvider } = await import("@/lib/persistence/registry");
  return { adapter, persistence: getPersistenceProvider() };
}

function buildResult(resolvedName: string): DealSearchResult {
  return { resolvedName, coldStart: true, deal: MOCK_DEAL, stakeholders: [], successCases: [] };
}

describe("pre-call-brief-adapter — resolveLatestAnalysis", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("resolves by hubspotDealId even when the passed company name doesn't match", async () => {
    const { adapter, persistence } = await loadAdapter();

    const deal = await persistence.syncDealFromHubspot({
      hubspotDealId: "hs-1",
      companyKey: "acme inc",
      resolvedName: "Acme Inc",
      domain: null,
      region: null,
      stage: null,
      amount: null,
      segment: null,
      industry: null,
      lastActivity: null,
      integraciones: null,
      integrationModules: null,
      modulosDeInteres: null,
      painDetected: null,
    });
    const analysis = await persistence.refreshAnalysis({
      dealId: deal.id,
      result: buildResult("Acme Inc"),
      coldStart: true,
      generatedAt: new Date().toISOString(),
    });

    // A different name is passed — only the hubspotDealId should matter.
    const target = await adapter.resolveLatestAnalysis("Totally Different Name", "hs-1");

    expect(target).toEqual({ dealId: deal.id, dealAnalysisId: analysis.id });
  });

  it("falls back to companyKey when hubspotDealId is null", async () => {
    const { adapter, persistence } = await loadAdapter();

    const deal = await persistence.syncDealFromHubspot({
      hubspotDealId: null,
      companyKey: "cold start co",
      resolvedName: "Cold Start Co",
      domain: null,
      region: null,
      stage: null,
      amount: null,
      segment: null,
      industry: null,
      lastActivity: null,
      integraciones: null,
      integrationModules: null,
      modulosDeInteres: null,
      painDetected: null,
    });
    const analysis = await persistence.refreshAnalysis({
      dealId: deal.id,
      result: buildResult("Cold Start Co"),
      coldStart: true,
      generatedAt: new Date().toISOString(),
    });

    const target = await adapter.resolveLatestAnalysis("Cold Start Co", null);

    expect(target).toEqual({ dealId: deal.id, dealAnalysisId: analysis.id });
  });

  it("returns null when a hubspotDealId is given but no deal matches it", async () => {
    const { adapter } = await loadAdapter();

    const target = await adapter.resolveLatestAnalysis("Whoever", "hs-does-not-exist");

    expect(target).toBeNull();
  });
});
