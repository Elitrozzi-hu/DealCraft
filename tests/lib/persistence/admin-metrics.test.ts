import { afterEach, describe, expect, it, vi } from "vitest";

import { mockPersistenceProvider } from "@/lib/persistence/providers/mock";

describe("mockPersistenceProvider — admin surface", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("isAdminEmail returns true for the seeded admin email", async () => {
    expect(await mockPersistenceProvider.isAdminEmail("santiago.penenory@humand.co")).toBe(true);
  });

  it("isAdminEmail returns false for a non-admin", async () => {
    expect(await mockPersistenceProvider.isAdminEmail("someone.else@humand.co")).toBe(false);
  });

  it("isAdminEmail returns false for an empty string", async () => {
    expect(await mockPersistenceProvider.isAdminEmail("")).toBe(false);
  });

  it("getAdminMetrics returns the AdminMetrics shape with zero defaults", async () => {
    const metrics = await mockPersistenceProvider.getAdminMetrics({
      trendSince: null,
      trendBucket: "month",
    });

    expect(metrics).toEqual({
      totalDealsAnalyzed: 0,
      totalCost: 0,
      costPerDeal: { avg: 0, min: 0, max: 0, topDeals: [] },
      costPerProvider: [],
      costByTask: [],
      topModels: [],
      dealsByUser: [],
      dealsByStage: [],
      dealsByRegion: [],
      dealsByIndustry: [],
      analysesOverTime: [],
    });
  });

  it("getAdminMetrics honors the range/bucket params without error", async () => {
    const metrics = await mockPersistenceProvider.getAdminMetrics({
      trendSince: new Date("2026-01-01T00:00:00Z"),
      trendBucket: "day",
    });
    expect(metrics.analysesOverTime).toEqual([]);
  });
});
