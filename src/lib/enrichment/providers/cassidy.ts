import { z } from "zod";

import { callCassidyWebhook } from "../../cassidy-client.js";
import { CASSIDY_API_KEY, CASSIDY_WEBHOOK_URL } from "../../server/env.js";
import { createLogger } from "../../server/logger.js";
import {
  llmResearchOutputSchema,
  type LlmResearchOutput,
  type LlmProvenance,
} from "../../llm/generations/company-research/structured-output.js";
import { normalize } from "../../llm/generations/company-research/normalize.js";
import type {
  EnrichmentInput,
  EnrichmentProvider,
  EnrichmentResult,
} from "../types.js";
import type { NormalizedEnrichment } from "../result-schema.js";

// This provider drives the `company-research` task through a CassidyAI workflow
// webhook instead of an LLM call. Cassidy's raw JSON uses Title-Case keys with a
// `{ Value, Provenance }` wrapper per field and a flatter per-item shape for
// stakeholders — `toResearchOutput` below translates that into the same
// `LlmResearchOutput` contract the `llm-websearch` provider extracts (see
// `src/lib/llm/generations/company-research/`), so both providers share the same
// `normalize()` → `NormalizedEnrichment` mapping.

interface CompanyResearchRequestBody {
  companyName: string | null;
  companyDomain: string | null;
  language: string;
}

function toRequestBody(input: EnrichmentInput): CompanyResearchRequestBody {
  return {
    companyName: input.companyName ?? null,
    companyDomain: input.domain ?? null,
    language: input.language ?? "es",
  };
}

// --- Cassidy's raw response shape ------------------------------------------
// Everything is parsed leniently (nullish/passthrough) so a partial workflow
// run still maps instead of throwing; missing sections fall back to "cold" via
// `toLlmProv`'s defaults. The exact key names for `Region`/`Headcount` are
// unconfirmed (not observed in sample runs where the company had no data for
// them) — parsed under the same `{ Value, Provenance }` shape as `Summary`.
const rawProvSchema = z
  .object({
    Source: z.string().nullish(),
    Status: z.string().nullish(),
    "Source URL": z.string().nullish(),
    Confidence: z.number().nullish(),
  })
  .nullish();

type RawProv = z.infer<typeof rawProvSchema>;

const rawValueFieldSchema = z
  .object({ Value: z.union([z.string(), z.number()]).nullish(), Provenance: rawProvSchema })
  .nullish();

const rawWorkforceFieldSchema = z
  .object({ "Value (0–100)": z.number().nullish(), Provenance: rawProvSchema })
  .nullish();

const rawStakeholderSchema = z.object({
  Name: z.string().nullish(),
  Email: z.string().nullish(),
  Title: z.string().nullish(),
  Status: z.string().nullish(),
  "Source URL": z.string().nullish(),
  "Decision Role": z.string().nullish(),
});

export const cassidyRawSchema = z
  .object({
    Summary: rawValueFieldSchema,
    Region: rawValueFieldSchema,
    Headcount: rawValueFieldSchema,
    "Workforce % Deskless / Frontline": rawWorkforceFieldSchema,
    // Item shape is unverified (sample runs returned an empty array), so parse
    // each entry as unknown and extract defensively in `toTechItems`.
    "Tech Stack": z.array(z.unknown()).nullish(),
    Stakeholders: z.array(rawStakeholderSchema).nullish(),
  })
  .passthrough();

type CassidyRaw = z.infer<typeof cassidyRawSchema>;

/** Cassidy sometimes joins multiple citation URLs with ", "; keep the first
 *  usable http(s) one. Only splits before another URL, so a single URL whose
 *  query string contains a comma (e.g. "?q=a,b") isn't truncated. */
function firstUrl(s: string | null | undefined): string | null {
  if (!s) return null;
  const first = s.split(/,\s*(?=https?:\/\/)/i)[0]?.trim();
  return first && /^https?:\/\//i.test(first) ? first : null;
}

/** Map Cassidy's flat `Provenance` block to the shared `LlmProvenance` shape. */
function toLlmProv(p: RawProv): LlmProvenance {
  const status = p?.Status;
  return {
    source: p?.Source ?? null,
    sourceUrl: firstUrl(p?.["Source URL"]),
    confidence: p?.Confidence ?? 0.5,
    status:
      status === "validated" || status === "inferred" || status === "cold"
        ? status
        : "inferred",
  };
}

function toStatus(s: string | null | undefined): LlmProvenance["status"] {
  return s === "validated" || s === "inferred" || s === "cold" ? s : "inferred";
}

/** Extract `{ tool }` names from Cassidy's loosely-typed Tech Stack; no known
 *  key carries a Humand relationship classification yet, so default to
 *  "coexistir" and an inferred provenance. */
function toTechItems(arr: unknown[] | null | undefined): LlmResearchOutput["techStack"] {
  if (!arr) return [];
  const items: LlmResearchOutput["techStack"] = [];
  for (const it of arr) {
    const name =
      typeof it === "string"
        ? it
        : it && typeof it === "object"
          ? ((it as Record<string, unknown>)["Tool Name"] ??
            (it as Record<string, unknown>).Technology ??
            (it as Record<string, unknown>).Name)
          : undefined;
    if (typeof name === "string" && name.trim()) {
      items.push({
        tool: name,
        relationshipWithHumand: "coexistir",
        provenance: toLlmProv(null),
      });
    }
  }
  return items;
}

/** Translate Cassidy's raw response into the `LlmResearchOutput` contract so it
 *  can flow through the same `normalize()` as the LLM path. Exported for tests
 *  exercising the raw-Title-Case-to-canonical mapping directly. */
export function toResearchOutput(raw: CassidyRaw): LlmResearchOutput {
  const workforce = raw["Workforce % Deskless / Frontline"];
  const workforceValue = workforce?.["Value (0–100)"];
  const headcountValue = raw.Headcount?.Value;
  return {
    summary: {
      value: typeof raw.Summary?.Value === "string" ? raw.Summary.Value : null,
      provenance: toLlmProv(raw.Summary?.Provenance),
    },
    region: {
      value: typeof raw.Region?.Value === "string" ? raw.Region.Value : null,
      provenance: toLlmProv(raw.Region?.Provenance),
    },
    headcount: {
      value: typeof headcountValue === "number" ? headcountValue : null,
      provenance: toLlmProv(raw.Headcount?.Provenance),
    },
    workforcePercentage: {
      value: typeof workforceValue === "number" ? workforceValue : null,
      provenance: toLlmProv(workforce?.Provenance),
    },
    techStack: toTechItems(raw["Tech Stack"]),
    stakeholders: (raw.Stakeholders ?? [])
      .filter((s) => typeof s.Name === "string" && s.Name.trim())
      .map((s) => ({
        name: s.Name ?? null,
        title: s.Title ?? null,
        decisionRole: s["Decision Role"] ?? null,
        email: s.Email ?? null,
        sourceUrl: firstUrl(s["Source URL"]),
        status: toStatus(s.Status),
      })),
  };
}

const DEFAULT_SOURCE = "Cassidy";

const log = createLogger("cassidy");

export const cassidyProvider: EnrichmentProvider = {
  name: "cassidy",
  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    if (!CASSIDY_WEBHOOK_URL) {
      throw new Error("CASSIDY_WEBHOOK_URL is not set.");
    }

    const unwrapped = await callCassidyWebhook({
      url: CASSIDY_WEBHOOK_URL,
      apiKey: CASSIDY_API_KEY,
      body: toRequestBody(input),
    });

    let data: NormalizedEnrichment;
    try {
      const raw = cassidyRawSchema.parse(unwrapped);
      const extracted = llmResearchOutputSchema.parse(toResearchOutput(raw));
      data = normalize(extracted, DEFAULT_SOURCE);
    } catch (err) {
      log.error("parse/normalize failed", {
        topLevelKeys:
          unwrapped && typeof unwrapped === "object"
            ? Object.keys(unwrapped).join(",")
            : typeof unwrapped,
      });
      throw err;
    }
    return {
      provider: "cassidy",
      data,
      raw: unwrapped,
      usage: [],
    };
  },
};
