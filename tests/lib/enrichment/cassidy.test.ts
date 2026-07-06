import { describe, expect, it } from "vitest";

import { cassidyProvider, cassidyRawSchema, toResearchOutput } from "@/lib/enrichment/providers/cassidy";
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

describe("toResearchOutput (raw Cassidy Title-Case payload)", () => {
  it("maps a full raw payload into the LlmResearchOutput contract", () => {
    const raw = cassidyRawSchema.parse({
      Summary: {
        Value: "An HR software company.",
        Provenance: { Source: "Cassidy", Status: "validated", "Source URL": "https://acme.com/about, https://acme.com/press", Confidence: 0.8 },
      },
      Region: { Value: "LATAM", Provenance: { Status: "inferred" } },
      Headcount: { Value: 250, Provenance: { Status: "validated" } },
      "Workforce % Deskless / Frontline": { "Value (0–100)": 40, Provenance: { Status: "inferred" } },
      "Tech Stack": [{ "Tool Name": "Workday" }, "SAP", { Technology: "BambooHR" }],
      Stakeholders: [
        { Name: "Jane Doe", Title: "CHRO", "Decision Role": "Decision Maker", Email: "jane@acme.com", Status: "validated", "Source URL": "https://acme.com/team" },
        { Name: "" }, // dropped: no usable name
      ],
    });

    const out = toResearchOutput(raw);

    expect(out.summary.value).toBe("An HR software company.");
    expect(out.summary.provenance.status).toBe("validated");
    expect(out.summary.provenance.sourceUrl).toBe("https://acme.com/about");
    expect(out.region.value).toBe("LATAM");
    expect(out.headcount.value).toBe(250);
    expect(out.workforcePercentage.value).toBe(40);
    expect(out.techStack.map((t) => t.tool)).toEqual(["Workday", "SAP", "BambooHR"]);
    expect(out.stakeholders).toHaveLength(1);
    expect(out.stakeholders[0]).toMatchObject({ name: "Jane Doe", decisionRole: "Decision Maker", status: "validated" });
  });

  it("falls back to nulls/empty arrays when Cassidy returns a mostly-empty payload", () => {
    const raw = cassidyRawSchema.parse({});
    const out = toResearchOutput(raw);

    expect(out.summary.value).toBeNull();
    expect(out.summary.provenance.status).toBe("inferred");
    expect(out.region.value).toBeNull();
    expect(out.headcount.value).toBeNull();
    expect(out.workforcePercentage.value).toBeNull();
    expect(out.techStack).toEqual([]);
    expect(out.stakeholders).toEqual([]);
  });

  it("treats an unrecognized provenance Status as inferred rather than throwing", () => {
    const raw = cassidyRawSchema.parse({
      Summary: { Value: "Test", Provenance: { Status: "not-a-real-status" } },
    });
    expect(toResearchOutput(raw).summary.provenance.status).toBe("inferred");
  });
});
