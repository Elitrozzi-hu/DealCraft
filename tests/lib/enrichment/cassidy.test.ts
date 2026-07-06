import { describe, expect, it } from "vitest";

import { cassidyProvider } from "@/lib/enrichment/providers/cassidy";
import type { LlmProvenance, LlmResearchOutput } from "@/lib/llm/generations/company-research/structured-output";

const prov = (over: Partial<LlmProvenance> = {}): LlmProvenance => ({
  source: null,
  sourceUrl: null,
  confidence: 0.5,
  status: "inferred",
  ...over,
});

const validOutput: LlmResearchOutput = {
  summary: { value: "An HR software company.", provenance: prov({ status: "validated" }) },
  region: { value: "LATAM", provenance: prov() },
  headcount: { value: 123.7, provenance: prov() },
  workforcePercentage: { value: 150, provenance: prov() },
  techStack: [],
  stakeholders: [
    { name: "Jane Doe", title: "CHRO", decisionRole: "Decision Maker", email: "jane@acme.com", sourceUrl: null, status: "inferred" },
  ],
};

describe("cassidy provider", () => {
  it("throws when the webhook URL is not configured", async () => {
    await expect(cassidyProvider.enrich({ companyName: "Acme" })).rejects.toThrow(
      "CASSIDY_WEBHOOK_URL is not set.",
    );
  });
});

describe("cassidy request/response contract", () => {
  it("parses an llmResearchOutputSchema-shaped payload and normalizes it", async () => {
    const { llmResearchOutputSchema } = await import("@/lib/llm/generations/company-research/structured-output");
    const { normalize } = await import("@/lib/llm/generations/company-research/normalize");

    const parsed = llmResearchOutputSchema.parse(validOutput);
    const out = normalize(parsed, "Cassidy");

    expect(out.summary.value).toBe("An HR software company.");
    expect(out.headcount?.value).toBe(124);
    expect(out.workforcePercentage?.value).toBe(100);
    expect(out.stakeholders).toHaveLength(1);
    expect(out.stakeholders[0].email).toBe("jane@acme.com");
  });
});
