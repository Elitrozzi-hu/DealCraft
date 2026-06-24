import "server-only";

import type {
  EnrichmentInput,
  EnrichmentProvider,
  EnrichmentResult,
} from "@/lib/enrichment/types";

// Deterministic, offline enrichment provider for smoke-testing the deals flow
// without spending vendor calls. Returns a fixed payload in the Classidy
// structured-output shape (see `company-enrichment-schema.json`, provenance
// without `timestamp`) so it flows through the same mapper as the real provider.
const prov = (status: "validated" | "inferred" | "cold") => ({
  source: "Mock",
  sourceType: "mock",
  confidence: status === "validated" ? 0.9 : 0.6,
  status,
});

export const mockEnrichmentProvider: EnrichmentProvider = {
  name: "mock",
  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    const company = input.companyName ?? input.domain ?? "Acme Inc.";
    return {
      provider: "mock",
      data: {
        summary: {
          value: `${company} is a deterministic mock company for local smoke tests.`,
          prov: prov("inferred"),
        },
        region: { value: "LATAM", prov: prov("validated") },
        industry: { value: "Software", prov: prov("validated") },
        workforcePercentage: { value: 60, prov: prov("inferred") },
        headcount: { value: 1200, prov: prov("inferred") },
        techStack: {
          items: [
            { name: "Slack", kind: "coexistir" },
            { name: "SharePoint", kind: "desplazar" },
            { name: "BambooHR", kind: "integrar" },
          ],
          prov: prov("inferred"),
        },
        stakeholders: [
          {
            name: "Jane Doe",
            title: "VP of People",
            decisionRole: "Head of HR",
            email: "jane.doe@acme.example",
            prov: prov("validated"),
          },
          {
            name: "John Roe",
            title: "CFO",
            decisionRole: "CFO",
            prov: prov("inferred"),
          },
        ],
        painPoints: [
          {
            label: "Fragmented frontline communication",
            prov: prov("inferred"),
          },
          { label: "Slow onboarding for new hires", prov: prov("inferred") },
        ],
      },
      raw: { mock: true, input },
    };
  },
};
