import { describe, expect, it } from "vitest";

import { UNMAPPED_TAXONOMY } from "@/lib/constants";
import type {
  NormalizedEnrichment,
  NormalizedProvenance,
} from "@/lib/enrichment/result-schema";
import {
  mapEnrichmentToDeal,
  resolveTaxonomy,
  toCrmPains,
  toPains,
  toRole,
  toStakeholders,
} from "@/lib/server/enrichment-to-deal";
import type { LeadDeal } from "@/types";

const prov = (over: Partial<NormalizedProvenance> = {}): NormalizedProvenance => ({
  source: "Web research",
  sourceType: "inferido",
  confidence: 0.5,
  status: "inferred",
  ...over,
});

const baseData = (over: Partial<NormalizedEnrichment> = {}): NormalizedEnrichment => ({
  summary: { value: "An HR company.", prov: prov({ status: "validated", confidence: 0.8 }) },
  region: { value: "LATAM", prov: prov() },
  workforcePercentage: { value: 60, prov: prov() },
  headcount: { value: 500, prov: prov() },
  techStack: { items: [], prov: prov() },
  stakeholders: [],
  painPoints: [],
  ...over,
});

const baseDeal = (over: Partial<LeadDeal> = {}): LeadDeal => ({
  id: "d1",
  name: "Acme",
  stageLabel: "Discovery",
  amount: 1000,
  industry: "Software",
  segment: "Mid-Market",
  painDetected: null,
  integraciones: null,
  integrationModules: null,
  modulosDeInteres: null,
  ...over,
});

describe("toRole", () => {
  it("maps each known decision role", () => {
    expect(toRole("Champion")).toBe("Champion");
    expect(toRole("Decision Maker")).toBe("Decision Maker");
    expect(toRole("CEO")).toBe("Decision Maker");
    expect(toRole("CFO")).toBe("Economic Buyer");
    expect(toRole("Head of HR")).toBe("Decision Maker");
    expect(toRole("Head of IT")).toBe("Influencer");
  });

  it("defaults unknown / nullish roles to Influencer", () => {
    expect(toRole("Janitor")).toBe("Influencer");
    expect(toRole(null)).toBe("Influencer");
    expect(toRole(undefined)).toBe("Influencer");
  });
});

describe("resolveTaxonomy", () => {
  it("matches a key exactly and returns its module", () => {
    expect(resolveTaxonomy("Reconocimiento")).toEqual({
      taxonomy: "Reconocimiento",
      module: "Reconocimientos + badges",
    });
  });

  it("matches case-insensitively and via substring", () => {
    expect(resolveTaxonomy("beneficios").taxonomy).toBe("Beneficios");
    expect(resolveTaxonomy("necesito beneficios para empleados").taxonomy).toBe(
      "Beneficios",
    );
  });

  it("returns the unmapped taxonomy with a null module when nothing matches", () => {
    expect(resolveTaxonomy("xyz unrelated")).toEqual({
      taxonomy: UNMAPPED_TAXONOMY,
      module: null,
    });
  });
});

describe("toStakeholders", () => {
  it("falls back to 'Por identificar', flags validated, and synthesizes ids", () => {
    const data = baseData({
      stakeholders: [
        {
          name: "  ",
          title: "CFO",
          decisionRole: "CFO",
          email: null,
          linkedinUrl: null,
          prov: prov({ status: "validated", source: "linkedin.com" }),
        },
        {
          name: "Jane",
          title: "CHRO",
          decisionRole: "Head of HR",
          email: "jane@acme.com",
          linkedinUrl: null,
          prov: prov(),
        },
      ],
    });
    const [s0, s1] = toStakeholders(data);
    expect(s0.id).toBe("cl-sh-0");
    expect(s0.name).toBe("Por identificar");
    expect(s0.role).toBe("Economic Buyer");
    expect(s0.validated).toBe(true);
    expect(s1.id).toBe("cl-sh-1");
    expect(s1.name).toBe("Jane");
    expect(s1.evidence).toContain("jane@acme.com");
    expect(s1.validated).toBe(false);
  });
});

describe("toCrmPains", () => {
  it("splits painDetected (unmapped) before modulosDeInteres (resolved), all validated", () => {
    const pains = toCrmPains(
      baseDeal({ painDetected: "Rotación alta, Ausentismo", modulosDeInteres: "Beneficios" }),
    );
    expect(pains.map((p) => p.label)).toEqual(["Rotación alta", "Ausentismo", "Beneficios"]);
    expect(pains.map((p) => p.id)).toEqual(["hs-p-0", "hs-p-1", "hs-p-2"]);
    expect(pains.every((p) => p.source === "crm" && p.conf === 1 && p.validated)).toBe(true);
    // painDetected entries are unmapped; the module of interest resolves.
    expect(pains[0].taxonomy).toBe(UNMAPPED_TAXONOMY);
    expect(pains[2].taxonomy).toBe("Beneficios");
    expect(pains[2].module).toBe("Beneficios + marketplace");
  });

  it("returns [] when no CRM pain fields are set", () => {
    expect(toCrmPains(baseDeal())).toEqual([]);
  });
});

describe("toPains", () => {
  it("carries confidence and validated from each pain's provenance", () => {
    const data = baseData({
      painPoints: [
        { label: "Manual onboarding", prov: prov({ status: "validated", confidence: 0.9 }) },
      ],
    });
    const [p] = toPains(data);
    expect(p).toMatchObject({
      id: "cl-p-0",
      label: "Manual onboarding",
      source: "firmographic",
      conf: 0.9,
      validated: true,
    });
  });
});

describe("mapEnrichmentToDeal", () => {
  it("maps a parsed enrichment object into the deal result", () => {
    const result = mapEnrichmentToDeal(baseData(), {
      resolvedName: "Acme Inc",
      stage: "lead",
      deal: baseDeal({ painDetected: "Rotación", modulosDeInteres: "Beneficios" }),
    });

    expect(result.resolvedName).toBe("Acme Inc");
    expect(result.deal.entity.resolved).toBe("Acme Inc");
    expect(result.deal.stage).toBe("lead");
    expect(result.deal.region).toBe("LATAM");
    expect(result.coldStart).toBe(false);
  });

  it("orders CRM pains before enrichment pains", () => {
    const result = mapEnrichmentToDeal(
      baseData({
        painPoints: [{ label: "Engagement bajo", prov: prov() }],
      }),
      {
        resolvedName: "Acme",
        stage: "lead",
        deal: baseDeal({ painDetected: "Rotación" }),
      },
    );
    expect(result.pains.map((p) => p.source)).toEqual(["crm", "firmographic"]);
    expect(result.pains.map((p) => p.label)).toEqual(["Rotación", "Engagement bajo"]);
  });

  it("flags coldStart when the summary provenance is cold", () => {
    const result = mapEnrichmentToDeal(
      baseData({ summary: { value: "—", prov: prov({ status: "cold", confidence: 0 }) } }),
      { resolvedName: "Acme", stage: "lead" },
    );
    expect(result.coldStart).toBe(true);
  });
});
