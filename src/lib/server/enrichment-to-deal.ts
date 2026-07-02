import type {
  Deal,
  DealSearchResult,
  LeadDeal,
  ProvenancedValue,
  Role,
  StageKey,
  Stakeholder,
  TechItem,
} from "../../types/index.js";
import {
  coldProv,
  enrichmentResultSchema,
  type NormalizedEnrichment,
} from "../enrichment/result-schema.js";
const ROLE_MAP: Record<string, Role> = {
  Champion: "Champion",
  "Decision Maker": "Decision Maker",
  Influencer: "Influencer",
  CEO: "Decision Maker",
  CFO: "Economic Buyer",
  "Head of HR": "Decision Maker",
  "Head of Operations": "Influencer",
  "Head of IT": "Influencer",
};

export function toRole(decisionRole: string | null | undefined): Role {
  return (decisionRole && ROLE_MAP[decisionRole]) || "Influencer";
}

export function toStakeholders(data: NormalizedEnrichment): Stakeholder[] {
  return data.stakeholders.map((s, i) => ({
    id: `cl-sh-${i}`,
    // The research can place a role without a verifiable name (it nulls names it
    // can't confirm). Show the gap honestly instead of hiding the stakeholder.
    name: s.name.trim() || "Por identificar",
    title: s.title,
    role: toRole(s.decisionRole),
    conf: s.prov.confidence,
    source: "firmographic",
    evidence: s.email
      ? `${s.email} · ${s.prov.source}`
      : `Identificado por ${s.prov.source} (${s.prov.sourceType}).`,
    validated: s.prov.status === "validated",
    linkedinUrl: s.linkedinUrl ?? undefined,
    sourceUrl: s.prov.url,
  }));
}

function toTech(data: NormalizedEnrichment): TechItem[] {
  return data.techStack.items.map((t) => ({ t: t.name, kind: t.kind, prov: t.prov }));
}


function toIndustry(deal: LeadDeal | undefined): ProvenancedValue {
  return deal?.industry
    ? {
        value: deal.industry,
        prov: {
          source: "HubSpot",
          sourceType: "declarado",
          confidence: 1,
          status: "validated",
        },
      }
    : { value: "—", prov: coldProv("HubSpot") };
}


export function mapEnrichmentToDeal(
  raw: unknown,
  ctx: { resolvedName: string; stage: StageKey; deal?: LeadDeal },
): DealSearchResult {
  const data = enrichmentResultSchema.parse(raw);

  const deskless = data.workforcePercentage
    ? {
        value: `≈${data.workforcePercentage.value}% deskless`,
        detail: "",
        prov: data.workforcePercentage.prov,
      }
    : { value: "—", detail: "", prov: coldProv("Enrichment") };

  const deal: Deal = {
    entity: {
      resolved: ctx.resolvedName,
      confidence: data.summary.prov.confidence,
      candidates: [],
    },
    stage: ctx.stage,
    region: data.region.value,
    firmographics: {
      summary: data.summary,
      industry: toIndustry(ctx.deal),
      regionProv: data.region.prov,
      headcount: data.headcount?.value ?? 0,
      headcountProv: data.headcount?.prov ?? coldProv("Enrichment"),
      deskless,
      tech: toTech(data),
      techProv: data.techStack.prov,
    },
    hubspot: {
      dealStage: ctx.deal?.stageLabel ?? "",
      amount: ctx.deal?.amount ?? null,
      lastActivity: "",
      notes: "",
      segment: ctx.deal?.segment ?? null,
      integraciones: ctx.deal?.integraciones ?? null,
    },
  };

  return {
    resolvedName: ctx.resolvedName,
    coldStart: data.summary.prov.status === "cold",
    deal,
    stakeholders: toStakeholders(data),
    successCases: [],
  };
}
