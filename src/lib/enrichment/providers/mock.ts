import type {
  EnrichmentInput,
  EnrichmentProvider,
  EnrichmentResult,
} from "../types.js";


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
      },
      raw: { mock: true, input },
      usage: [],
    };
  },
};
