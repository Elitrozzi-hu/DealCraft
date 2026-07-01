import { z } from "zod";

import { generate } from "../../llm/generate.js";
import { LUSHA_API_KEY } from "../../server/env.js";
import { createLogger } from "../../server/logger.js";
import {
  coldProv,
  enrichmentResultSchema,
  type NormalizedEnrichment,
  type NormalizedProvenance,
} from "../result-schema.js";
import type { EnrichmentInput, EnrichmentProvider } from "../types.js";

// This file is the ONLY place that encodes the Lusha vendor contract: endpoint
// URLs, authentication, request/response shapes, credit flow, and the mapping
// into the shared `NormalizedEnrichment` shape. Nothing outside this file knows
// about the Lusha API.

const log = createLogger("lusha");

const LUSHA_BASE_URL = "https://api.lusha.com";

// ─── Provenance constants ─────────────────────────────────────────────────────

const API_PROV: NormalizedProvenance = {
  source: "Lusha",
  sourceType: "api",
  confidence: 0.9,
  status: "validated",
};

const LLM_PROV: NormalizedProvenance = {
  source: "lusha/llm",
  sourceType: "inferido",
  confidence: 0.5,
  status: "inferred",
};

// ─── Cost tracking ────────────────────────────────────────────────────────────

interface LushaCost {
  lushaCredits: {
    /** Credits charged for POST /v3/companies/search (from billing.creditsCharged). */
    companySearch: number;
    /** Credits charged for employeesByDepartment reveal (0 when not revealed). */
    employeesByDept: number;
    /** Credits charged for the contact search component. */
    contactSearch: number;
    /** Credits charged for email reveals (1 per contact with an email revealed). */
    emailReveals: number;
    total: number;
  };
  llmTokens: { input: number; output: number };
  /** USD cost of the LLM call used to generate painPoints (null if not reported). */
  llmCostUsd: number | null;
  wallClockMs: number;
}

// ─── Zod schemas for Lusha API responses ─────────────────────────────────────

const canRevealItemSchema = z.object({
  field: z.string(),
  credits: z.number().int(),
});

const billingSchema = z.object({
  creditsCharged: z.number().int().nullish(),
  resultsReturned: z.number().int().nullish(),
});

// POST /v3/companies/search
const companySearchResultSchema = z.object({
  id: z.string().nullish(),
  name: z.string().nullish(),
  domain: z.string().nullish(),
  canReveal: z.array(canRevealItemSchema).nullish(),
  error: z
    .object({ code: z.string(), message: z.string() })
    .nullish(),
});

const companySearchResponseSchema = z.object({
  requestId: z.string().nullish(),
  results: z.array(companySearchResultSchema).nullish(),
  billing: billingSchema.nullish(),
});

// POST /v3/companies/enrich
const companyEnrichResultSchema = z.object({
  id: z.string().nullish(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  employeeCount: z
    .object({
      exact: z.number().int().nullish(),
      min: z.number().int().nullish(),
      max: z.number().int().nullish(),
    })
    .nullish(),
  location: z
    .object({
      city: z.string().nullish(),
      state: z.string().nullish(),
      country: z.string().nullish(),
    })
    .nullish(),
  technologies: z.array(z.string()).nullish(),
  employeesByDepartment: z
    .array(z.object({ department: z.string(), count: z.number().int() }))
    .nullish(),
  intent: z.unknown().nullish(),
  funding: z.unknown().nullish(),
  error: z
    .object({ code: z.string(), message: z.string() })
    .nullish(),
});

const companyEnrichResponseSchema = z.object({
  requestId: z.string().nullish(),
  results: z.array(companyEnrichResultSchema).nullish(),
  billing: billingSchema.nullish(),
});

// POST /v3/contacts/decision-makers (preview — no PII, free)
const decisionMakerPreviewSchema = z.object({
  id: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  fullName: z.string().nullish(),
  jobTitle: z
    .object({
      title: z.string().nullish(),
      departments: z.array(z.string()).nullish(),
      seniority: z.string().nullish(),
    })
    .nullish(),
  socialLinks: z
    .object({ linkedin: z.string().nullish(), xUrl: z.string().nullish() })
    .nullish(),
});

const decisionMakersResultSchema = z.object({
  companyId: z.string().nullish(),
  contacts: z.array(decisionMakerPreviewSchema).nullish(),
  error: z.object({ code: z.string(), message: z.string() }).nullish(),
});

const decisionMakersResponseSchema = z.object({
  requestId: z.string().nullish(),
  results: z.array(decisionMakersResultSchema).nullish(),
  billing: billingSchema.nullish(),
});

// POST /v3/contacts/search-and-enrich  |  POST /v3/contacts/enrich
const contactResultSchema = z.object({
  id: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  fullName: z.string().nullish(),
  jobTitle: z
    .object({
      title: z.string().nullish(),
      departments: z.array(z.string()).nullish(),
      seniority: z.string().nullish(),
    })
    .nullish(),
  socialLinks: z
    .object({
      linkedin: z.string().nullish(),
      xUrl: z.string().nullish(),
    })
    .nullish(),
  emails: z
    .array(
      z.object({
        email: z.string(),
        type: z.string().nullish(),
        confidence: z.string().nullish(),
      }),
    )
    .nullish(),
  error: z
    .object({ code: z.string(), message: z.string() })
    .nullish(),
  clientReferenceId: z.string().nullish(),
});

const contactSearchEnrichResponseSchema = z.object({
  requestId: z.string().nullish(),
  results: z.array(contactResultSchema).nullish(),
  billing: billingSchema.nullish(),
});

// LLM pain points schema
const painPointsSchema = z.object({
  painPoints: z.array(z.string()),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

type LushaCompany = z.infer<typeof companyEnrichResultSchema>;
type LushaContact = z.infer<typeof contactResultSchema>;

// ─── Fetch helper ─────────────────────────────────────────────────────────────

const LUSHA_TIMEOUT_MS = 20_000;

async function lushaPost(path: string, body: unknown, apiKey: string): Promise<unknown> {
  const res = await fetch(`${LUSHA_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(LUSHA_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Lusha API error: ${res.status} — ${text}`);
  }
  try {
    return await res.json();
  } catch {
    throw new Error("Lusha API returned a non-JSON response");
  }
}

// ─── Step 1: Company search ───────────────────────────────────────────────────

async function searchCompany(
  domain: string,
  apiKey: string,
): Promise<{ id: string; canRevealFields: string[]; creditsCharged: number; raw: unknown }> {
  const raw = await lushaPost("/v3/companies/search", { companies: [{ domain }] }, apiKey);
  const parsed = companySearchResponseSchema.parse(raw);
  const first = parsed.results?.[0];
  if (!first || first.error || !first.id) {
    const reason = first?.error?.message ?? "not found";
    throw new Error(`Lusha: company "${domain}" not found (${reason})`);
  }
  return {
    id: first.id,
    canRevealFields: first.canReveal?.map((r) => r.field) ?? [],
    creditsCharged: parsed.billing?.creditsCharged ?? 1,
    raw: parsed,
  };
}

// ─── Step 2: Company enrich ───────────────────────────────────────────────────

async function enrichCompany(
  id: string,
  canRevealFields: string[],
  apiKey: string,
): Promise<{ company: LushaCompany; creditsCharged: number; raw: unknown }> {
  const reveal: string[] = ["intent"];
  if (canRevealFields.includes("employeesByDepartment")) {
    reveal.push("employeesByDepartment");
  }

  const raw = await lushaPost("/v3/companies/enrich", { ids: [id], reveal }, apiKey);
  const parsed = companyEnrichResponseSchema.parse(raw);
  const first = parsed.results?.[0];
  if (!first || first.error) {
    const reason = first?.error?.message ?? "enrich failed";
    throw new Error(`Lusha: company enrich failed for id "${id}" (${reason})`);
  }
  return {
    company: first,
    creditsCharged: parsed.billing?.creditsCharged ?? 0,
    raw: parsed,
  };
}

// ─── Step 3: Contact lookup — two strategies ─────────────────────────────────
//
// a) Email known (typical app flow from HubSpot): single search-and-enrich call.
// b) Domain only (benchmark / no contact email): decision-makers preview → enrich.

async function searchEnrichByEmail(
  email: string,
  apiKey: string,
): Promise<{ contacts: LushaContact[]; creditsCharged: number; raw: unknown }> {
  const raw = await lushaPost(
    "/v3/contacts/search-and-enrich",
    { contacts: [{ email, clientReferenceId: "1" }], reveal: ["emails"] },
    apiKey,
  );
  const parsed = contactSearchEnrichResponseSchema.parse(raw);
  const contacts = (parsed.results ?? []).filter((c) => !c.error);
  return { contacts, creditsCharged: parsed.billing?.creditsCharged ?? 0, raw: parsed };
}

async function getDecisionMakersByDomain(
  domain: string,
  apiKey: string,
): Promise<{ contacts: LushaContact[]; creditsCharged: number; raw: unknown }> {
  // Step 1: free preview — returns IDs only, no PII
  const dmRaw = await lushaPost(
    "/v3/contacts/decision-makers",
    { companies: [{ domain }] },
    apiKey,
  );
  const dmParsed = decisionMakersResponseSchema.parse(dmRaw);

  const ids = (dmParsed.results ?? [])
    .flatMap((r) => (r.error ? [] : (r.contacts ?? [])))
    .map((c) => c.id)
    .filter((id): id is string => typeof id === "string")
    .slice(0, 5);

  if (ids.length === 0) {
    return { contacts: [], creditsCharged: 0, raw: { decisionMakers: dmParsed, enrich: null } };
  }

  // Step 2: enrich to reveal emails (costs credits)
  const enrichRaw = await lushaPost(
    "/v3/contacts/enrich",
    { ids, reveal: ["emails"] },
    apiKey,
  );
  const enrichParsed = contactSearchEnrichResponseSchema.parse(enrichRaw);
  const contacts = (enrichParsed.results ?? []).filter((c) => !c.error);
  return {
    contacts,
    creditsCharged: enrichParsed.billing?.creditsCharged ?? 0,
    raw: { decisionMakers: dmParsed, enrich: enrichParsed },
  };
}

async function findContacts(
  input: EnrichmentInput,
  apiKey: string,
): Promise<{ contacts: LushaContact[]; creditsCharged: number; raw: unknown; method: string }> {
  if (input.email) {
    const r = await searchEnrichByEmail(input.email, apiKey);
    return { ...r, method: "email" };
  }
  const domain = input.domain!;
  const r = await getDecisionMakersByDomain(domain, apiKey);
  return { ...r, method: "decision-makers" };
}

// ─── Step 4: Generate pain points via LLM ────────────────────────────────────

function extractIntentTopics(intent: unknown): string {
  if (!intent) return "";
  if (typeof intent === "string") return intent;
  if (Array.isArray(intent)) {
    return intent.filter((t) => typeof t === "string").join(", ");
  }
  if (typeof intent === "object" && intent !== null) {
    const obj = intent as Record<string, unknown>;
    const topics = obj.topics ?? obj.items;
    if (Array.isArray(topics)) {
      return topics.filter((t) => typeof t === "string").join(", ");
    }
  }
  return "";
}

async function generatePainPoints(
  description: string | null | undefined,
  intent: unknown,
): Promise<{ labels: string[]; tokens: { input: number; output: number }; llmCostUsd: number | null }> {
  const intentStr = extractIntentTopics(intent);

  const parts: string[] = [];
  if (description) parts.push(`Company description: ${description}`);
  if (intentStr) parts.push(`Purchase intent signals: ${intentStr}`);

  const system =
    "You are a B2B sales analyst specializing in HR-tech and workforce software. " +
    "Given a company description and purchase intent signals, list 3-5 concise pain " +
    "points that an HR/workforce platform like Humand could address. " +
    "Each pain point must be a single actionable sentence in English.";

  const prompt = parts.length > 0 ? parts.join("\n\n") : "Generate generic HR pain points.";

  let tokens = { input: 0, output: 0 };
  let llmCostUsd: number | null = null;
  try {
    const result = await generate({
      schema: painPointsSchema,
      system,
      prompt,
      onUsage: (u) => {
        tokens = { input: u.inputTokens ?? 0, output: u.outputTokens ?? 0 };
        llmCostUsd = u.costUsd ?? null;
      },
    });
    return { labels: result.painPoints, tokens, llmCostUsd };
  } catch (err) {
    // Model failed to produce structured output (e.g. no description/intent data).
    // Return empty rather than crashing the whole enrichment.
    log.warn("Lusha pain points generation failed, returning empty", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { labels: [], tokens, llmCostUsd };
  }
}

// ─── Normalize ────────────────────────────────────────────────────────────────

// Email confidence rank (A+ is best). Used to pick the highest-confidence email.
const CONFIDENCE_RANK: Record<string, number> = { "A+": 5, A: 4, B: 3, C: 2, D: 1 };

function normalize(
  company: LushaCompany,
  contacts: LushaContact[],
  painPointLabels: string[],
): NormalizedEnrichment {
  const summary = company.description
    ? { value: company.description, prov: API_PROV }
    : { value: "", prov: coldProv("Lusha") };

  const city = company.location?.city ?? "";
  const country = company.location?.country ?? "";
  const regionValue = [city, country].filter(Boolean).join(", ");
  const region = regionValue
    ? { value: regionValue, prov: API_PROV }
    : { value: "", prov: coldProv("Lusha") };

  const exactCount = company.employeeCount?.exact;
  const headcount: NormalizedEnrichment["headcount"] =
    typeof exactCount === "number" ? { value: exactCount, prov: API_PROV } : null;

  // workforcePercentage — find HR/People department and compute % of total
  let workforcePercentage: NormalizedEnrichment["workforcePercentage"] = null;
  const total = company.employeeCount?.exact;
  if (company.employeesByDepartment && typeof total === "number" && total > 0) {
    const hrEntry = company.employeesByDepartment.find((d) => {
      const dept = d.department.toLowerCase();
      return (
        dept.includes("hr") ||
        dept.includes("human resources") ||
        dept.includes("people") ||
        dept.includes("talent")
      );
    });
    if (hrEntry) {
      workforcePercentage = {
        value: Math.round((hrEntry.count / total) * 100),
        prov: API_PROV,
      };
    }
  }

  const techs = company.technologies ?? [];
  const techStack: NormalizedEnrichment["techStack"] = {
    items: techs.map((name) => ({ name, kind: "coexistir" as const, prov: API_PROV })),
    prov: techs.length > 0 ? API_PROV : coldProv("Lusha"),
  };

  const stakeholders: NormalizedEnrichment["stakeholders"] = contacts.map((c) => {
    const sortedEmails = [...(c.emails ?? [])].sort(
      (a, b) =>
        (CONFIDENCE_RANK[b.confidence ?? ""] ?? 0) -
        (CONFIDENCE_RANK[a.confidence ?? ""] ?? 0),
    );
    const bestEmail = sortedEmails[0]?.email ?? null;
    const name =
      c.fullName ??
      [c.firstName, c.lastName].filter(Boolean).join(" ") ??
      "";

    return {
      name,
      title: c.jobTitle?.title ?? "",
      decisionRole: null,
      email: bestEmail,
      linkedinUrl: c.socialLinks?.linkedin ?? null,
      prov: API_PROV,
    };
  });

  const painPoints = painPointLabels.map((label) => ({ label, prov: LLM_PROV }));

  return enrichmentResultSchema.parse({
    summary,
    region,
    workforcePercentage,
    headcount,
    techStack,
    stakeholders,
    painPoints,
  });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const lushaProvider: EnrichmentProvider = {
  name: "lusha",

  async enrich(input: EnrichmentInput) {
    const apiKey = LUSHA_API_KEY;
    if (!apiKey) throw new Error("LUSHA_API_KEY is not set");

    const domain = input.domain ?? input.email?.split("@")[1];
    if (!domain) throw new Error("Lusha: a domain or email is required for enrichment");

    const start = Date.now();

    // 1. Company search
    const { id, canRevealFields, creditsCharged: searchCredits, raw: searchRaw } =
      await searchCompany(domain, apiKey);
    log.debug("Lusha company search", { domain, companyId: id, creditsCharged: searchCredits });

    // 2. Company enrich
    const { company, creditsCharged: enrichCredits, raw: enrichRaw } =
      await enrichCompany(id, canRevealFields, apiKey);
    const hasDeptReveal = canRevealFields.includes("employeesByDepartment");
    log.debug("Lusha company enrich", {
      companyId: id,
      hasDeptReveal: hasDeptReveal ? 1 : 0,
      creditsCharged: enrichCredits,
    });

    // 3. Find contacts — by email if available, otherwise by decision-makers
    const { contacts, creditsCharged: contactCredits, raw: contactRaw, method: contactMethod } =
      await findContacts(input, apiKey);
    const emailReveals = contacts.filter((c) => (c.emails?.length ?? 0) > 0).length;
    log.debug("Lusha contact lookup", {
      method: contactMethod,
      contactCount: contacts.length,
      emailReveals,
      creditsCharged: contactCredits,
    });

    // 4. Generate pain points via LLM
    const { labels: painPointLabels, tokens: llmTokens, llmCostUsd } = await generatePainPoints(
      company.description,
      company.intent,
    );
    log.debug("Lusha pain points generated", {
      count: painPointLabels.length,
      inputTokens: llmTokens.input,
      outputTokens: llmTokens.output,
    });

    // 5. Normalize
    const normalized = normalize(company, contacts, painPointLabels);

    const wallClockMs = Date.now() - start;
    const totalCredits = searchCredits + enrichCredits + contactCredits;
    const cost: LushaCost = {
      lushaCredits: {
        companySearch: searchCredits,
        employeesByDept: enrichCredits,
        contactSearch: contactCredits - emailReveals,
        emailReveals,
        total: totalCredits,
      },
      llmTokens,
      llmCostUsd,
      wallClockMs,
    };

    log.info("Lusha enrichment complete", {
      domain,
      totalCredits,
      llmCostUsd,
      wallClockMs,
    });

    return {
      provider: "lusha",
      data: normalized,
      raw: { search: searchRaw, enrich: enrichRaw, contacts: contactRaw },
      meta: { cost },
    };
  },
};
