import { timingSafeEqual } from "node:crypto";

import { ZodError } from "zod";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { NOTION_WEBHOOK_TOKEN } from "@/lib/server/env";
import { createLogger } from "@/lib/server/logger";
import { syncSuccessCaseFromNotion } from "@/lib/server/success-case-sync";

// Cassidy can take minutes to scrape; outlive the default so the function isn't
// killed before the 290s fetch timeout. Mirrors deals/search.
export const config = { maxDuration: 300 };

const log = createLogger("notion-webhook/success-cases");

function hasNotionProperties(
  b: unknown,
): b is { data: { properties: Record<string, unknown> } } {
  if (!b || typeof b !== "object") return false;
  const data = (b as Record<string, unknown>).data;
  if (!data || typeof data !== "object") return false;
  const properties = (data as Record<string, unknown>).properties;
  return (
    !!properties && typeof properties === "object" && !Array.isArray(properties)
  );
}

function isAuthorized(req: VercelRequest): boolean {
  if (!NOTION_WEBHOOK_TOKEN) return false;
  // Vercel lowercases header keys; `token` may arrive as string | string[].
  const raw = req.headers.token;
  const provided = Array.isArray(raw) ? raw[0] : raw;
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(NOTION_WEBHOOK_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** POST /api/notion-webhook/success-cases — sync one Notion page event into the
 *  success-cases store. Inbound auth: shared secret in the `token` header
 *  (compared against NOTION_WEBHOOK_TOKEN). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  if (!isAuthorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!hasNotionProperties(req.body)) {
    res.status(400).json({ error: "Unrecognized Notion payload" });
    return;
  }
  const ev = log
    .event("notion-webhook/success-cases.request")
    .set("method", "POST")
    .set("path", "/api/notion-webhook/success-cases");
  const t0 = Date.now();
  try {
    const result = await syncSuccessCaseFromNotion(req.body);
    ev.set("slug", result.slug)
      .set("syncStatus", result.status)
      .set("status", 200)
      .set("durationMs", Date.now() - t0)
      .emit();
    res.status(200).json(result);
  } catch (err) {
    const { status, error } = mapSyncError(err);
    ev.set("status", status).set("durationMs", Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? "error" : "info");
    res.status(status).json({ error });
  }
}

/** unrecognizable payload → 400; misconfig / timeout / vendor / unexpected-shape → 502; else 500. */
function mapSyncError(err: unknown): { status: number; error: string } {
  if (err instanceof ZodError) {
    return { status: 502, error: "Cassidy returned an unexpected shape." };
  }
  if (err instanceof Error) {
    if (err.message.includes("CASSIDY_SUCCESS_CASE_WEBHOOK_URL is not set")) {
      return { status: 502, error: "Success-case sync is not configured." };
    }
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { status: 502, error: "Cassidy success-case workflow timed out." };
    }
    if (err.message.startsWith("Cassidy success-case workflow failed")) {
      return { status: 502, error: err.message };
    }
    if (err.message.includes("Unrecognizable Notion payload")) {
      return { status: 400, error: err.message };
    }
  }
  const message = err instanceof Error ? err.message : String(err);
  return { status: 500, error: `Success-case sync failed: ${message}` };
}
