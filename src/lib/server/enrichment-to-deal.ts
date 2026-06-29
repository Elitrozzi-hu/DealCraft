import type {
  Deal,
  DealSearchResult,
  LeadDeal,
  Pain,
  ProvenancedValue,
  Role,
  StageKey,
  Stakeholder,
  TechItem,
} from "@/types";
import {
  coldProv,
  enrichmentResultSchema,
  type NormalizedEnrichment,
} from "@/lib/enrichment/result-schema";
import { SOLUTION_GRAPH, UNMAPPED_TAXONOMY } from "@/lib/constants";
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

function toRole(decisionRole: string | null | undefined): Role {
  return (decisionRole && ROLE_MAP[decisionRole]) || "Influencer";
}

function toStakeholders(data: NormalizedEnrichment): Stakeholder[] {
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

/** Attempt case-insensitive substring match against SOLUTION_GRAPH keys. */
function resolveTaxonomy(value: string): { taxonomy: string; module: string | null } {
  const lower = value.toLowerCase();
  for (const key of Object.keys(SOLUTION_GRAPH) as (keyof typeof SOLUTION_GRAPH)[]) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return { taxonomy: key, module: SOLUTION_GRAPH[key] };
    }
  }
  return { taxonomy: UNMAPPED_TAXONOMY, module: null };
}

/**
 * Build synthetic `Pain[]` from the CRM deal's declared fields.
 * Pain items are prepended before LLM-inferred pains so they sort first.
 */
function toCrmPains(deal: LeadDeal): Pain[] {
  const items: Pain[] = [];
  let idx = 0;

  const addPain = (label: string, taxonomy: string, module: string | null) => {
    items.push({
      id: `hs-p-${idx++}`,
      label,
      taxonomy,
      source: "crm",
      conf: 1,
      evidence: "HubSpot · declarado",
      module,
      validated: true,
    });
  };

  if (deal.painDetected) {
    for (const raw of deal.painDetected.split(",")) {
      const label = raw.trim();
      if (label) addPain(label, UNMAPPED_TAXONOMY, null);
    }
  }

  for (const field of [deal.modulosDeInteres]) {
    if (!field) continue;
    for (const raw of field.split(",")) {
      const label = raw.trim();
      if (!label) continue;
      const { taxonomy, module } = resolveTaxonomy(label);
      addPain(label, taxonomy, module);
    }
  }

  return items;
}

function toPains(data: NormalizedEnrichment): Pain[] {
  return data.painPoints.map((p, i) => ({
    id: `cl-p-${i}`,
    label: p.label,
    taxonomy: UNMAPPED_TAXONOMY,
    source: "firmographic",
    conf: p.prov.confidence,
    evidence: `${p.prov.source} · ${p.prov.sourceType}`,
    module: null,
    validated: p.prov.status === "validated",
    sourceUrl: p.prov.url,
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

  const crmPains = ctx.deal ? toCrmPains(ctx.deal) : [];

  return {
    resolvedName: ctx.resolvedName,
    coldStart: data.summary.prov.status === "cold",
    deal,
    stakeholders: toStakeholders(data),
    pains: [...crmPains, ...toPains(data)],
    successCases: [],
  };
}
