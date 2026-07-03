import { describe, expect, it } from "vitest";

import { getPersistenceProvider } from "@/lib/persistence/registry";

describe("getPersistenceProvider", () => {
  it("defaults to the supabase provider", () => {
    expect(getPersistenceProvider().name).toBe("supabase");
  });

  it("resolves an explicit override", () => {
    expect(getPersistenceProvider("mock").name).toBe("mock");
  });

  it("throws on an unknown provider", () => {
    expect(() => getPersistenceProvider("bogus")).toThrow(/Unknown persistence provider "bogus"/);
  });
});

describe("mock persistence provider", () => {
  it("satisfies the cold-start → sync → refresh → getLatestAnalysis contract", async () => {
    const provider = getPersistenceProvider("mock");

    expect(await provider.findDeal({ companyKey: "acme" })).toBeNull();

    const deal = await provider.syncDealFromHubspot({
      hubspotDealId: null,
      companyKey: "acme",
      resolvedName: "Acme",
      domain: "acme.com",
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
    expect(deal.companyKey).toBe("acme");

    expect(await provider.getLatestAnalysis(deal.id)).toBeNull();

    const analysis = await provider.refreshAnalysis({
      dealId: deal.id,
      result: { resolvedName: "Acme" } as never,
      coldStart: true,
      generatedAt: new Date().toISOString(),
    });
    expect(analysis.isLatest).toBe(true);

    const latest = await provider.getLatestAnalysis(deal.id);
    expect(latest?.id).toBe(analysis.id);

    const refreshed = await provider.refreshAnalysis({
      dealId: deal.id,
      result: { resolvedName: "Acme v2" } as never,
      coldStart: false,
      generatedAt: new Date().toISOString(),
    });
    expect(refreshed.id).not.toBe(analysis.id);

    // The old version must have flipped to is_latest = false.
    const stale = await provider.updateSignals(
      analysis.id,
      { company: "Acme", domain: "acme.com", signals: [] },
      1,
    );
    expect(stale).toBe(false);

    const current = await provider.updateSignals(
      refreshed.id,
      { company: "Acme", domain: "acme.com", signals: [] },
      1,
    );
    expect(current).toBe(true);
  });

  it("dedupes insertLlmCall by callId", async () => {
    const provider = getPersistenceProvider("mock");
    const entry = {
      callId: "call-1",
      task: "company-research" as const,
      provider: "openrouter",
      model: "test-model",
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      costUsd: 0.01,
      dealId: null,
      dealAnalysisId: null,
    };
    await provider.insertLlmCall(entry);
    await expect(provider.insertLlmCall(entry)).resolves.toBeUndefined();
  });
});
