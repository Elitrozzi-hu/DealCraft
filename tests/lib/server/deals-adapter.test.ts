import { afterEach, describe, expect, it, vi } from "vitest";

import type { DealSearchRequest, LeadDeal } from "@/types";

// Force the `mock` persistence provider (no DB) and the `mock` enrichment
// provider (no network), then dynamically re-import `deals-adapter` fresh per
// test so the in-memory persistence state never leaks across cases.
async function loadAdapter() {
  vi.resetModules();
  vi.stubEnv("PERSISTENCE_PROVIDER", "mock");
  const adapter = await import("@/lib/server/deals-adapter");
  const mockEnrichment = await import("@/lib/enrichment/providers/mock");
  return { adapter, mockEnrichment };
}

function leadDeal(id: string): LeadDeal {
  return {
    id,
    name: null,
    stageLabel: null,
    amount: null,
    industry: null,
    segment: null,
    painDetected: null,
    integraciones: null,
    integrationModules: null,
    modulosDeInteres: null,
  };
}

describe("enrichDeal — requires an associated HubSpot deal", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("throws NoAssociatedDealError when the request carries no deal", async () => {
    const { adapter } = await loadAdapter();
    const req: DealSearchRequest = { name: "No Deal Co", enrichmentProvider: "mock" };

    await expect(adapter.enrichDeal(req)).rejects.toBeInstanceOf(
      adapter.NoAssociatedDealError,
    );
  });

  it("throws NoAssociatedDealError when deal.id is empty", async () => {
    const { adapter } = await loadAdapter();
    const req: DealSearchRequest = {
      name: "Empty Id Co",
      deal: leadDeal(""),
      enrichmentProvider: "mock",
    };

    await expect(adapter.enrichDeal(req)).rejects.toBeInstanceOf(
      adapter.NoAssociatedDealError,
    );
  });
});

describe("enrichDeal — first-time / reopen / refresh", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("first time: deal never seen before → runs enrichment and persists a new analysis", async () => {
    const { adapter, mockEnrichment } = await loadAdapter();
    const spy = vi.spyOn(mockEnrichment.mockEnrichmentProvider, "enrich");

    const req: DealSearchRequest = {
      name: "Acme First",
      deal: leadDeal("hs-1"),
      enrichmentProvider: "mock",
    };
    const { result } = await adapter.enrichDeal(req);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.resolvedName).toBe("Acme First");
  });

  it("reopen: stored analysis exists and refresh is falsy → skips enrichment entirely", async () => {
    const { adapter, mockEnrichment } = await loadAdapter();
    const spy = vi.spyOn(mockEnrichment.mockEnrichmentProvider, "enrich");

    const req: DealSearchRequest = {
      name: "Acme Reopen",
      deal: leadDeal("hs-2"),
      enrichmentProvider: "mock",
    };
    const first = await adapter.enrichDeal(req);
    expect(spy).toHaveBeenCalledTimes(1);

    const second = await adapter.enrichDeal(req);
    expect(spy).toHaveBeenCalledTimes(1); // still 1 — no new enrichment call
    expect(second.result.resolvedName).toBe("Acme Reopen");
    expect(second.provider).toBe("stored");
    // Firmographics come from the stored snapshot, untouched.
    expect(second.result.deal.firmographics.summary).toEqual(
      first.result.deal.firmographics.summary,
    );
  });

  it("reopen: the same deal found under a different resolved name (renamed in HubSpot) still reopens", async () => {
    const { adapter, mockEnrichment } = await loadAdapter();
    const spy = vi.spyOn(mockEnrichment.mockEnrichmentProvider, "enrich");

    const req: DealSearchRequest = {
      name: "Old Name Co",
      deal: leadDeal("hs-3"),
      enrichmentProvider: "mock",
    };
    await adapter.enrichDeal(req);
    expect(spy).toHaveBeenCalledTimes(1);

    const renamed = await adapter.enrichDeal({
      ...req,
      name: "New Name Co",
    });
    expect(spy).toHaveBeenCalledTimes(1); // matched by hubspotDealId, not name
    expect(renamed.provider).toBe("stored");
  });

  it("refresh: true re-runs enrichment and inserts a new analysis version", async () => {
    const { adapter, mockEnrichment } = await loadAdapter();
    const spy = vi.spyOn(mockEnrichment.mockEnrichmentProvider, "enrich");

    const req: DealSearchRequest = {
      name: "Acme Refresh",
      deal: leadDeal("hs-4"),
      enrichmentProvider: "mock",
    };
    await adapter.enrichDeal(req);
    expect(spy).toHaveBeenCalledTimes(1);

    const refreshed = await adapter.enrichDeal({ ...req, refresh: true });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(refreshed.provider).not.toBe("stored");
  });
});
