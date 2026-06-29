import { timingSafeEqual } from "node:crypto";

import { ZodError } from "zod";

import { NOTION_WEBHOOK_TOKEN } from "@/lib/server/env";
import { createLogger } from "@/lib/server/logger";
import { syncSuccessCaseFromNotion } from "@/lib/server/success-case-sync";

// Cassidy can take minutes to scrape; outlive the default so the route isn't
// killed before the 290s fetch timeout. Mirrors deals/search.
export const maxDuration = 300;

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

function isAuthorized(request: Request): boolean {
  if (!NOTION_WEBHOOK_TOKEN) return false;
  const provided = request.headers.get("token");
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(NOTION_WEBHOOK_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** POST /api/notion-webhook/success-cases — sync one Notion page event into the
 *  success-cases store. Inbound auth: shared secret in the `token` header
 *  (compared against NOTION_WEBHOOK_TOKEN). */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!hasNotionProperties(body)) {
    return Response.json({ error: "Unrecognized Notion payload" }, { status: 400 });
  }
  const ev = log
    .event("notion-webhook/success-cases.request")
    .set("method", "POST")
    .set("path", "/api/notion-webhook/success-cases");
  const t0 = Date.now();
  try {
    const result = await syncSuccessCaseFromNotion(body);
    ev.set("slug", result.slug)
      .set("syncStatus", result.status)
      .set("status", 200)
      .set("durationMs", Date.now() - t0)
      .emit();
    return Response.json(result, { status: 200 });
  } catch (err) {
    const { status, error } = mapSyncError(err);
    ev.set("status", status).set("durationMs", Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? "error" : "info");
    return Response.json({ error }, { status });
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
