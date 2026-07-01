import type { PublishedSuccessCase } from "../../types/index.js";
import { unwrapEnvelope } from "../cassidy-envelope.js";
import { CASSIDY_SUCCESS_CASE_WEBHOOK_URL } from "./env.js";
import { createLogger } from "./logger.js";
import {
  buildMetadataOnlyRecord,
  parseNotionProperties,
} from "./notion-success-case.js";
import { validateCassidyRecord } from "./success-case-schema.js";
import { upsertSuccessCase } from "./success-cases-reader.js";

const log = createLogger("success-case-sync");

type PrePersistRecord = Omit<PublishedSuccessCase, "synced_at">;

export interface SyncResult {
  slug: string;
  company: string;
  status: "synced" | "metadata-only";
}

/** POST the bare Notion `properties` to the Cassidy workflow (no auth — the URL is
 *  the secret), then unwrap + validate the response. */
export async function callCassidySuccessCase(
  props: unknown,
): Promise<PrePersistRecord> {
  if (!CASSIDY_SUCCESS_CASE_WEBHOOK_URL) {
    throw new Error("CASSIDY_SUCCESS_CASE_WEBHOOK_URL is not set.");
  }
  const res = await fetch(CASSIDY_SUCCESS_CASE_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(props),
    signal: AbortSignal.timeout(290_000),
  });
  if (!res.ok) {
    throw new Error(`Cassidy success-case workflow failed: ${res.status}`);
  }
  const raw: unknown = await res.json();
  try {
    return validateCassidyRecord(unwrapEnvelope(raw));
  } catch (err) {
    log.error("validate failed", {
      topLevelKeys:
        raw && typeof raw === "object" ? Object.keys(raw).join(",") : typeof raw,
    });
    throw err;
  }
}

function extractProperties(payload: unknown): Record<string, unknown> {
  const data =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>).data
      : null;
  const properties =
    data && typeof data === "object"
      ? (data as Record<string, unknown>).properties
      : null;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    throw new Error("Unrecognizable Notion payload: missing data.properties object.");
  }
  return properties as Record<string, unknown>;
}

/** Branch on `link_web`: present → Cassidy (full path); absent → metadata-only.
 *  Stamp `synced_at` and upsert by slug. */
export async function syncSuccessCaseFromNotion(
  payload: unknown,
): Promise<SyncResult> {
  const properties = extractProperties(payload);
  const { link_web } = parseNotionProperties(properties);

  const validated: PrePersistRecord = link_web
    ? await callCassidySuccessCase(properties)
    : buildMetadataOnlyRecord(properties);

  const record: PublishedSuccessCase = {
    ...validated,
    synced_at: new Date().toISOString(),
  };
  upsertSuccessCase(record);

  return {
    slug: record.slug,
    company: record.company,
    status: link_web ? "synced" : "metadata-only",
  };
}
