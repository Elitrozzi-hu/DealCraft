import { describe, expect, it } from "vitest";

import { buildQuery } from "@/lib/enrichment/providers/llm-websearch";
import type { EnrichmentInput } from "@/lib/enrichment/types";

describe("llm-websearch buildQuery", () => {
  const input = (over: Partial<EnrichmentInput> = {}): EnrichmentInput => over;

  it("combines company name and domain", () => {
    expect(buildQuery(input({ companyName: "Acme", domain: "acme.com" }))).toBe(
      "Acme acme.com company enrichment profile",
    );
  });

  it("works with only one field", () => {
    expect(buildQuery(input({ companyName: "Acme" }))).toBe(
      "Acme company enrichment profile",
    );
  });

  it("falls back when neither is present", () => {
    expect(buildQuery(input())).toBe("company enrichment profile");
  });
});
