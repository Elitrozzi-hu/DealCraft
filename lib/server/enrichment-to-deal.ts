import "server-only";

import type {
  Deal,
  DealSearchResult,
  Pain,
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

// Maps the shared, provider-agnostic enrichment output (`NormalizedEnrichment`,
// produced by any enrichment provider) into the deal-analysis domain shape
// (`DealSearchResult`). The single seam between the enrichment contract and the
// `Deal` / `Pain` / `Stakeholder` types the UI renders. Anything enrichment does
// not provide (deal stage comes from HubSpot; comparables/HubSpot snapshot are
// absent) gets an honest default rather than fabricated data.

// The provider's `decisionRole` taxonomy is richer than our buying-committee
// `Role`. Collapse it to the closest committee role; unknown/null → "Influencer"
// (the least-committal non-empty role).
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
    name: s.name,
    title: s.title,
    role: toRole(s.decisionRole),
    conf: s.prov.confidence,
    source: "firmographic",
    evidence: s.email
      ? `${s.email} · ${s.prov.source}`
      : `Identificado por ${s.prov.source} (${s.prov.sourceType}).`,
    validated: s.prov.status === "validated",
    linkedinUrl: s.linkedinUrl ?? undefined,
  }));
}

function toPains(data: NormalizedEnrichment): Pain[] {
  return data.painPoints.map((p, i) => ({
    id: `cl-p-${i}`,
    label: p.label,
    // Enrichment returns free-text pains with no taxonomy; mapping a pain to a
    // Humand module (solution graph) is a follow-up, so leave it unmapped.
    taxonomy: "Otro (no mapeado)",
    source: "firmographic",
    conf: p.prov.confidence,
    evidence: `${p.prov.source} · ${p.prov.sourceType}`,
    module: null,
    validated: p.prov.status === "validated",
  }));
}

function toTech(data: NormalizedEnrichment): TechItem[] {
  return data.techStack.items.map((t) => ({ t: t.name, kind: t.kind }));
}

/**
 * Map a validated normalized enrichment payload to a `DealSearchResult`.
 * @param raw the provider's `EnrichmentResult.data` (re-validated here so a
 *   misconfigured provider fails loudly instead of rendering garbage).
 * @param ctx the resolved company name + the deal stage (mapped upstream from
 *   the HubSpot lead's `lifecycleStage`).
 */
export function mapEnrichmentToDeal(
  raw: unknown,
  ctx: { resolvedName: string; stage: StageKey },
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
      industry: data.industry,
      headcount: data.headcount?.value ?? 0,
      headcountProv: data.headcount?.prov ?? coldProv("Enrichment"),
      deskless,
      tech: toTech(data),
      techProv: data.techStack.prov,
    },
    hubspot: { dealStage: "", lastActivity: "", notes: "" },
  };

  return {
    resolvedName: ctx.resolvedName,
    coldStart: data.summary.prov.status === "cold",
    deal,
    stakeholders: toStakeholders(data),
    pains: toPains(data),
  };
}
