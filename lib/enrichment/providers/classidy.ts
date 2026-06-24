import "server-only";

import { z } from "zod";

import { CLASSIDY_API_KEY, CLASSIDY_WEBHOOK_URL } from "@/lib/server/env";
import { createLogger } from "@/lib/server/logger";
import type { TechKind } from "@/types";
import type {
  EnrichmentInput,
  EnrichmentProvider,
  EnrichmentResult,
} from "@/lib/enrichment/types";
import {
  coldProv,
  type NormalizedEnrichment,
  type NormalizedProvenance,
} from "@/lib/enrichment/result-schema";

// Classidy (Cassidy): a synchronous third-party enrichment workflow. One request
// in, the enriched result in the same response body — no job store, status
// endpoint, or callbacks. This file is the ONLY place that encodes the Classidy
// contract: the webhook request body, Cassidy's raw response shape, and the
// normalization into the shared `NormalizedEnrichment` shape (see
// `lib/enrichment/result-schema.ts`, which mirrors `company-enrichment-schema.json`).

// --- Webhook request body --------------------------------------------------
// Cassidy expects exactly these four fields (NOT our internal `EnrichmentInput`
// field names). Mapping our input → this body is the single request seam.
interface ClassidyRequestBody {
  jobTitle: string | null;
  contactEmail: string | null;
  companyName: string | null;
  companyDomain: string | null;
}

function toRequestBody(input: EnrichmentInput): ClassidyRequestBody {
  return {
    jobTitle: input.jobTitle ?? null,
    contactEmail: input.email ?? null,
    companyName: input.companyName ?? null,
    companyDomain: input.domain ?? null,
  };
}

// The normalized output shape lives in `lib/enrichment/result-schema.ts`
// (`NormalizedEnrichment`); `normalize` below maps Cassidy's raw response into it.

// --- Cassidy's raw response shape ------------------------------------------
// Cassidy returns Title-Case keys with spaces and a nested `Provenance Metadata`
// block per datum. Everything is parsed leniently (nullish) so a partial
// workflow run still maps instead of throwing; `normalize` fills the gaps with
// honest "cold" defaults.
const rawProvSchema = z
  .object({
    Source: z.string().nullish(),
    "Source Type": z.string().nullish(),
    Confidence: z.number().nullish(),
    Status: z.string().nullish(),
    Timestamp: z.string().nullish(),
  })
  .nullish();

const cassidyRawSchema = z
  .object({
    "Company Summary": z
      .object({ Summary: z.string().nullish(), "Provenance Metadata": rawProvSchema })
      .nullish(),
    "Region Information": z
      .object({ Region: z.string().nullish(), "Provenance Metadata": rawProvSchema })
      .nullish(),
    "Industry Data": z
      .object({ Industry: z.string().nullish(), "Provenance Metadata": rawProvSchema })
      .nullish(),
    "Workforce Percentage": z
      .object({
        "Workforce Percentage": z.number().nullish(),
        "Provenance Metadata": rawProvSchema,
      })
      .nullish(),
    "Company Headcount": z
      .object({ Headcount: z.number().nullish(), "Provenance Metadata": rawProvSchema })
      .nullish(),
    // Item shape is unverified (the sample run returned an empty array), so parse
    // each entry as unknown and extract defensively in `normalize`.
    "Technology Stack": z.array(z.unknown()).nullish(),
    "Key Stakeholders": z
      .array(
        z.object({
          Name: z.string().nullish(),
          Email: z.string().nullish(),
          Title: z.string().nullish(),
          "LinkedIn URL": z.string().nullish(),
          "Decision Role": z.string().nullish(),
          "Provenance Metadata": rawProvSchema,
        }),
      )
      .nullish(),
    "Company Pain Points": z
      .array(
        z.object({
          "Pain Point": z.string().nullish(),
          "Provenance Metadata": rawProvSchema,
        }),
      )
      .nullish(),
  })
  .passthrough();

type CassidyRaw = z.infer<typeof cassidyRawSchema>;
type RawProv = z.infer<typeof rawProvSchema>;

// --- Workflow envelope -----------------------------------------------------
// Cassidy does not return the enrichment object at the top level. It wraps it in
// a workflow-run envelope: the data is a JSON string — usually inside a ```json
// code fence — at `workflowRun.actionResults[].output`. We unwrap to the bare
// data object before parsing; if the response is already unwrapped (no
// envelope), we pass it through unchanged.
const envelopeSchema = z
  .object({
    workflowRun: z
      .object({
        actionResults: z
          .array(
            z.object({
              name: z.string().nullish(),
              output: z.string().nullish(),
            }),
          )
          .nullish(),
      })
      .nullish(),
  })
  .nullish();

/** Strip a leading/trailing ```json … ``` (or plain ```) code fence. */
function stripCodeFence(s: string): string {
  const trimmed = s.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return fenced ? fenced[1] : trimmed;
}

/** Unwrap Cassidy's workflow envelope to the bare enrichment data object. */
function unwrapEnvelope(raw: unknown): unknown {
  const env = envelopeSchema.safeParse(raw);
  const actionResults = env.success ? env.data?.workflowRun?.actionResults : null;
  if (!actionResults?.length) return raw;
  const action =
    actionResults.find((a) => typeof a.output === "string" && a.output.trim()) ??
    actionResults[0];
  const output = action?.output;
  if (typeof output !== "string" || !output.trim()) return raw;
  try {
    return JSON.parse(stripCodeFence(output));
  } catch {
    return raw;
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Map Cassidy's `Provenance Metadata` to our normalized provenance, with
 *  honest defaults when a field is missing. */
function toProv(p: RawProv): NormalizedProvenance {
  const status = p?.Status;
  return {
    source: p?.Source ?? "Cassidy",
    sourceType: p?.["Source Type"] ?? "inferido",
    confidence: clamp(p?.Confidence ?? 0.5, 0, 1),
    status:
      status === "validated" || status === "inferred" || status === "cold"
        ? status
        : "inferred",
  };
}

function toKind(raw: unknown): TechKind {
  return raw === "desplazar" || raw === "integrar" || raw === "coexistir"
    ? raw
    : "coexistir";
}

/** Extract `{ name, kind }` items from Cassidy's loosely-typed Technology Stack. */
function toTechItems(arr: unknown[] | null | undefined): NormalizedEnrichment["techStack"]["items"] {
  if (!arr) return [];
  const items: NormalizedEnrichment["techStack"]["items"] = [];
  for (const it of arr) {
    if (typeof it === "string") {
      items.push({ name: it, kind: "coexistir" });
      continue;
    }
    if (it && typeof it === "object") {
      const o = it as Record<string, unknown>;
      const name =
        o["Tool Name"] ?? o.Technology ?? o.Name ?? o.Tool ?? o.name;
      if (typeof name === "string" && name.trim()) {
        items.push({
          name,
          kind: toKind(o["Humand Relationship"] ?? o.Kind ?? o.kind ?? o.Type),
        });
      }
    }
  }
  return items;
}

/** Normalize Cassidy's raw response into the shared `NormalizedEnrichment` contract. */
function normalize(raw: CassidyRaw): NormalizedEnrichment {
  const summary = raw["Company Summary"];
  const region = raw["Region Information"];
  const industry = raw["Industry Data"];
  const workforce = raw["Workforce Percentage"];
  const headcount = raw["Company Headcount"];

  const techItems = toTechItems(raw["Technology Stack"]);

  return {
    summary: {
      value: summary?.Summary ?? "—",
      prov: summary ? toProv(summary["Provenance Metadata"]) : coldProv("Cassidy"),
    },
    region: {
      value: region?.Region ?? "—",
      prov: region ? toProv(region["Provenance Metadata"]) : coldProv("Cassidy"),
    },
    industry: {
      value: industry?.Industry ?? "—",
      prov: industry ? toProv(industry["Provenance Metadata"]) : coldProv("Cassidy"),
    },
    workforcePercentage:
      workforce && typeof workforce["Workforce Percentage"] === "number"
        ? {
            value: clamp(workforce["Workforce Percentage"], 0, 100),
            prov: toProv(workforce["Provenance Metadata"]),
          }
        : null,
    headcount:
      headcount && typeof headcount.Headcount === "number"
        ? {
            value: Math.max(0, Math.round(headcount.Headcount)),
            prov: toProv(headcount["Provenance Metadata"]),
          }
        : null,
    techStack: {
      items: techItems,
      // Cassidy provides no array-level provenance for the tech stack.
      prov: techItems.length ? { ...coldProv("Cassidy"), status: "inferred", confidence: 0.5 } : coldProv("Cassidy"),
    },
    stakeholders: (raw["Key Stakeholders"] ?? [])
      .filter((s) => typeof s.Name === "string" && s.Name.trim())
      .map((s) => ({
        name: s.Name as string,
        title: s.Title ?? "",
        decisionRole: s["Decision Role"] ?? null,
        // Cassidy uses the literal "Not available" for missing emails.
        email: s.Email && s.Email !== "Not available" ? s.Email : null,
        // Same "Not available" sentinel for LinkedIn; keep only real http(s) URLs.
        linkedinUrl:
          s["LinkedIn URL"] &&
          s["LinkedIn URL"] !== "Not available" &&
          /^https?:\/\//i.test(s["LinkedIn URL"])
            ? s["LinkedIn URL"]
            : null,
        prov: toProv(s["Provenance Metadata"]),
      })),
    painPoints: (raw["Company Pain Points"] ?? [])
      .filter((p) => typeof p["Pain Point"] === "string" && p["Pain Point"]!.trim())
      .map((p) => ({
        label: p["Pain Point"] as string,
        prov: toProv(p["Provenance Metadata"]),
      })),
  };
}

const log = createLogger("classidy");

export const classidyProvider: EnrichmentProvider = {
  name: "classidy",
  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    if (!CLASSIDY_WEBHOOK_URL) {
      throw new Error("CLASSIDY_WEBHOOK_URL is not set.");
    }

    const t0 = Date.now();
    const res = await fetch(CLASSIDY_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CLASSIDY_API_KEY ?? ""}`,
      },
      body: JSON.stringify(toRequestBody(input)),
      signal: AbortSignal.timeout(290_000),
    });
    log.debug("workflow response", {
      status: res.status,
      ok: res.ok,
      durationMs: Date.now() - t0,
    });

    if (!res.ok) {
      throw new Error(`Classidy workflow failed: ${res.status}`);
    }

    const raw: unknown = await res.json();
    // Raw + normalized payloads carry contact PII (names, emails). They ride on
    // `log.debug`, which sits below the prod default level — so they're dropped
    // before serialization in prod, surfacing only under LOG_LEVEL=debug.
    log.debug("raw response", { raw: JSON.stringify(raw) });
    let data: NormalizedEnrichment;
    try {
      data = normalize(cassidyRawSchema.parse(unwrapEnvelope(raw)));
    } catch (err) {
      // Keys only — no PII — so this is safe at error level.
      log.error("parse/normalize failed", {
        topLevelKeys:
          raw && typeof raw === "object"
            ? Object.keys(raw).join(",")
            : typeof raw,
      });
      throw err;
    }
    log.debug("normalized data", { data: JSON.stringify(data) });
    return {
      provider: "classidy",
      data: data as unknown as Record<string, unknown>,
      raw,
    };
  },
};
