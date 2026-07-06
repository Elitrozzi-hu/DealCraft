import { clamp } from "../../../enrichment/clamp.js";
import {
  coldProv,
  type NormalizedEnrichment,
  type NormalizedProvenance,
} from "../../../enrichment/result-schema.js";
import type { LlmResearchOutput, LlmProvenance } from "./structured-output.js";

// Maps `LlmResearchOutput` (this task's structured-output contract) into the
// shared `NormalizedEnrichment` shape. Shared because more than one enrichment
// provider produces this exact contract — today the LLM websearch call
// (`llm-websearch.ts`) and the Cassidy company-research webhook (`cassidy.ts`)
// both do, so the mapping rules (confidence clamping, source-link surfacing,
// stakeholder provenance synthesis) live in one place instead of being
// duplicated per provider.

/** If `s` is a usable http(s) URL, return its canonical href + a tidy label
 *  (the www-stripped hostname); otherwise null. The prompt allows `source` to be
 *  "URL or source name", so this tells the two apart without trusting the model. */
export function asSourceUrl(s: string | null): { href: string; label: string } | null {
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return { href: u.href, label: u.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

// `status` is the single inference signal (the model/workflow no longer
// self-reports a separate `sourceType`); derive a human-readable type label
// from it for the badge.
const SOURCE_TYPE_BY_STATUS: Record<LlmProvenance["status"], string> = {
  validated: "declarado",
  inferred: "inferido",
  cold: "sin dato",
};

// Stakeholders carry a leaner shape (just `sourceUrl` + `status`, no self-reported
// confidence); compute confidence from status instead, per the "confidence is
// computed, not self-reported" convention.
const CONFIDENCE_BY_STATUS: Record<LlmProvenance["status"], number> = {
  validated: 0.9,
  inferred: 0.5,
  cold: 0.2,
};

/** Build the normalized provenance for a stakeholder from its lean self-report.
 *  A link is surfaced only for a validated person citing a real page. `defaultSource`
 *  is the fallback label when no page/name is available (differs per producer —
 *  "Web research" for the LLM call, "Cassidy" for the webhook). */
export function stakeholderProv(
  sourceUrl: string | null,
  status: LlmProvenance["status"],
  defaultSource: string,
): NormalizedProvenance {
  const link = status === "validated" ? asSourceUrl(sourceUrl) : null;
  return {
    source: link?.label ?? defaultSource,
    sourceType: SOURCE_TYPE_BY_STATUS[status],
    confidence: CONFIDENCE_BY_STATUS[status],
    status,
    ...(link ? { url: link.href } : {}),
  };
}

/** Map the self-reported provenance into our normalized shape, with honest
 *  defaults and confidence clamped to [0,1] (the sent schema no longer bounds
 *  it). */
export function fromLlmProv(p: LlmProvenance, defaultSource: string): NormalizedProvenance {
  // Surface a clickable source link ONLY for non-inferred fields that cite a real
  // URL. An inferred/cold field is a benchmark/estimate with no page to open, so it
  // stays a plain badge (matches the "link only when the source is not inferido"
  // rule and the never-fabricate-a-destination policy). Prefer the explicit
  // `sourceUrl`; fall back to `source` when the model put a URL there instead.
  const link =
    p.status === "validated"
      ? (asSourceUrl(p.sourceUrl) ?? asSourceUrl(p.source))
      : null;
  // If `source` itself is a URL, show a tidy hostname rather than the raw link.
  const sourceLabel = asSourceUrl(p.source)?.label ?? p.source ?? defaultSource;
  return {
    source: sourceLabel,
    sourceType: SOURCE_TYPE_BY_STATUS[p.status],
    confidence: clamp(p.confidence, 0, 1),
    status: p.status,
    ...(link ? { url: link.href } : {}),
  };
}

/** Map the research output into the shared normalized shape. `defaultSource` is
 *  the fallback source label for fields with no usable source ("Web research"
 *  for the LLM call, "Cassidy" for the webhook). */
export function normalize(out: LlmResearchOutput, defaultSource: string): NormalizedEnrichment {
  return {
    summary: out.summary.value?.trim()
      ? { value: out.summary.value, prov: fromLlmProv(out.summary.provenance, defaultSource) }
      : { value: "—", prov: coldProv(defaultSource) },
    region: out.region.value?.trim()
      ? { value: out.region.value, prov: fromLlmProv(out.region.provenance, defaultSource) }
      : { value: "—", prov: coldProv(defaultSource) },
    workforcePercentage:
      typeof out.workforcePercentage.value === "number"
        ? {
            value: clamp(out.workforcePercentage.value, 0, 100),
            prov: fromLlmProv(out.workforcePercentage.provenance, defaultSource),
          }
        : null,
    headcount:
      typeof out.headcount.value === "number"
        ? {
            value: Math.max(0, Math.round(out.headcount.value)),
            prov: fromLlmProv(out.headcount.provenance, defaultSource),
          }
        : null,
    techStack: {
      items: out.techStack
        .filter((t) => t.tool.trim())
        .map((t) => ({
          name: t.tool,
          kind: t.relationshipWithHumand,
          prov: fromLlmProv(t.provenance, defaultSource),
        })),
      prov: out.techStack.length
        ? fromLlmProv(out.techStack[0].provenance, defaultSource)
        : coldProv(defaultSource),
    },
    stakeholders: out.stakeholders
      // Keep anyone the model could place on the buying committee: rule #1 of the
      // prompt makes it null an unverifiable NAME, so a real CFO with no confirmed
      // name still arrives as { name: null, title: "CFO", decisionRole: ... }.
      // Dropping those (old `s.name?.trim()` filter) hid stakeholders the research
      // genuinely found; keep them when any identifying field is present.
      .filter((s) => s.name?.trim() || s.title?.trim() || s.decisionRole?.trim())
      .map((s) => ({
        name: s.name?.trim() ?? "",
        title: s.title ?? "",
        decisionRole: s.decisionRole ?? null,
        email: s.email ?? null,
        prov: stakeholderProv(s.sourceUrl, s.status, defaultSource),
      })),
  };
}
