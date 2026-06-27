import "server-only";

import { getHubspotAccessToken } from "@/lib/crm/providers/hubspot-auth";
import type { LeadDeal } from "@/types";

// HubSpot **Deal** lookup — isolated from the Contacts search contract in
// `hubspot.ts`. Resolves the deals associated with a set of contacts and their
// stage labels in the fewest calls possible, all read-only:
//
//   (a) POST /crm/v4/associations/contacts/deals/batch/read  — every contact's
//       deal ids in ONE batched call (the doc's per-contact GET, batched).
//   (b) POST /crm/v3/objects/deals/batch/read                — the unique deal
//       ids' properties in ONE call.
//   (c) GET  /crm-pipelines/v1/pipelines/deals               — the LEGACY
//       endpoint (the modern `/crm/v3/pipelines/deals` is blocked for this
//       token), read once to build a stageId → label map for the request AND to
//       find the stages that belong to BDR pipelines (excluded below).
//
// Deals whose stage belongs to a **BDR pipeline** (pipeline label contains
// "BDR") are filtered out — they are not valid analysis targets. The pipeline is
// matched by label, not a hardcoded id, so a stage rename needs no code change.
//
// Total = 3 deal-side calls regardless of candidate or deal count. The numeric
// `dealstage` id is resolved to its label at read time and never stored, so a
// stage rename in HubSpot needs no code change. The whole REST contract (URLs,
// property names, response shapes) lives only in this file.

const API_BASE = "https://api.hubapi.com";

// The only deal properties we read and normalize into `LeadDeal`.
const DEAL_PROPERTIES = [
  "dealname",
  "dealstage",
  "amount",
  "industria_hu",
  "segment_v2",
  "pain_detected",
  "integraciones",
  "integration_modules",
  "modulos_que_les_interesan",
] as const;

/** Stay well under the route's request budget (mirrors `hubspot-auth.ts`). */
const FETCH_TIMEOUT_MS = 20_000;

// --- Vendor response shapes (kept private to this file) --------------------

interface AssociationsBatchResponse {
  results?: Array<{
    from?: { id?: string };
    to?: Array<{ toObjectId?: string | number }>;
  }>;
}

interface DealsBatchResponse {
  results?: Array<{
    id?: string;
    properties?: Record<string, string | null>;
  }>;
}

interface PipelinesResponse {
  results?: Array<{
    label?: string;
    stages?: Array<{ stageId?: string; label?: string }>;
  }>;
}

/** Stage-label map + the stage ids belonging to BDR pipelines (to exclude). */
interface PipelineInfo {
  labels: Map<string, string>;
  bdrStageIds: Set<string>;
}

/** Authenticated HubSpot fetch; throws a descriptive error on a non-2xx. */
async function hubspotFetch<T>(
  token: string,
  path: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `HubSpot deal lookup failed: ${res.status} ${path} ${detail}`.trim(),
    );
  }

  return (await res.json()) as T;
}

/** (a) Resolve each contact's associated deal ids in one batched call. */
async function fetchContactDealAssociations(
  token: string,
  contactIds: string[],
): Promise<Map<string, string[]>> {
  const data = await hubspotFetch<AssociationsBatchResponse>(
    token,
    "/crm/v4/associations/contacts/deals/batch/read",
    { method: "POST", body: JSON.stringify({ inputs: contactIds.map((id) => ({ id })) }) },
  );

  const byContact = new Map<string, string[]>();
  for (const row of data.results ?? []) {
    const contactId = row.from?.id;
    if (!contactId) continue;
    const dealIds = (row.to ?? [])
      .map((t) => (t.toObjectId != null ? String(t.toObjectId) : ""))
      .filter((id) => id !== "");
    byContact.set(contactId, dealIds);
  }
  return byContact;
}

/** (b) Batch-read the curated properties for the unique deal ids. */
async function fetchDealProperties(
  token: string,
  dealIds: string[],
): Promise<Map<string, Record<string, string | null>>> {
  const byDeal = new Map<string, Record<string, string | null>>();
  if (!dealIds.length) return byDeal;

  const data = await hubspotFetch<DealsBatchResponse>(
    token,
    "/crm/v3/objects/deals/batch/read",
    {
      method: "POST",
      body: JSON.stringify({
        properties: [...DEAL_PROPERTIES],
        inputs: dealIds.map((id) => ({ id })),
      }),
    },
  );

  for (const row of data.results ?? []) {
    if (row.id) byDeal.set(row.id, row.properties ?? {});
  }
  return byDeal;
}

/** Whether a pipeline is a BDR pipeline (matched by label, not a hardcoded id). */
function isBdrPipeline(label: string | undefined): boolean {
  return !!label && label.toUpperCase().includes("BDR");
}

/** (c) Build the stageId → label map across all pipelines (legacy endpoint), plus
 *  the set of stage ids that belong to BDR pipelines (deals there are excluded). */
async function fetchPipelineInfo(token: string): Promise<PipelineInfo> {
  const data = await hubspotFetch<PipelinesResponse>(
    token,
    "/crm-pipelines/v1/pipelines/deals",
    { method: "GET" },
  );

  const labels = new Map<string, string>();
  const bdrStageIds = new Set<string>();
  for (const pipeline of data.results ?? []) {
    const bdr = isBdrPipeline(pipeline.label);
    for (const stage of pipeline.stages ?? []) {
      if (!stage.stageId) continue;
      if (stage.label) labels.set(stage.stageId, stage.label);
      if (bdr) bdrStageIds.add(stage.stageId);
    }
  }
  return { labels, bdrStageIds };
}

/** Coerce HubSpot's stringified amount to a number, or null when absent/invalid. */
function toAmount(raw: string | null | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Coerce a HubSpot string property to a trimmed value or null. */
function toText(raw: string | null | undefined): string | null {
  return raw && raw.trim() !== "" ? raw : null;
}

/**
 * Resolve the deals associated with each contact, with stage labels and the
 * curated `LeadDeal` shape. Read-only; mints the bearer once and runs the three
 * deal-side calls (stage labels in parallel with the associations→deals chain).
 * Contacts with no deals map to an empty array. Throws (→ surfaced as a server
 * error by the route) if any HubSpot call fails.
 */
export async function fetchDealsForContacts(
  contactIds: string[],
): Promise<Map<string, LeadDeal[]>> {
  const result = new Map<string, LeadDeal[]>();
  if (!contactIds.length) return result;

  const token = await getHubspotAccessToken();

  // Pipeline info doesn't depend on the associations chain, so fetch it in
  // parallel — same call count, lower latency. Both are read-only.
  const [associations, pipelines] = await Promise.all([
    fetchContactDealAssociations(token, contactIds),
    fetchPipelineInfo(token),
  ]);

  const uniqueDealIds = [...new Set([...associations.values()].flat())];
  const dealProps = await fetchDealProperties(token, uniqueDealIds);

  /** A deal in a BDR pipeline is not a valid analysis target → excluded. */
  const isBdrDeal = (dealId: string): boolean => {
    const stageId = toText(dealProps.get(dealId)?.dealstage);
    return !!stageId && pipelines.bdrStageIds.has(stageId);
  };

  const toLeadDeal = (dealId: string): LeadDeal => {
    const p = dealProps.get(dealId) ?? {};
    const stageId = toText(p.dealstage);
    return {
      id: dealId,
      name: toText(p.dealname),
      // Resolve the label at read time; an unmapped id degrades to null ("—").
      stageLabel: stageId ? (pipelines.labels.get(stageId) ?? null) : null,
      amount: toAmount(p.amount),
      industry: toText(p.industria_hu),
      segment: toText(p.segment_v2),
      painDetected: toText(p.pain_detected),
      integraciones: toText(p.integraciones),
      integrationModules: toText(p.integration_modules),
      modulosDeInteres: toText(p.modulos_que_les_interesan),
    };
  };

  for (const contactId of contactIds) {
    const dealIds = associations.get(contactId) ?? [];
    result.set(contactId, dealIds.filter((id) => !isBdrDeal(id)).map(toLeadDeal));
  }
  return result;
}

