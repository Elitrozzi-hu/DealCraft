import { ZodError } from "zod";

import type { DealSearchRequest } from "@/types";
import { enrichDeal } from "@/lib/server/deals-adapter";
import { createLogger } from "@/lib/server/logger";

// Cassidy's synchronous workflow can take several minutes; allow the route to
// outlive the default so it doesn't get killed before the fetch timeout (290s).
export const maxDuration = 300;

const log = createLogger("deals/search");

function isSearchRequest(b: unknown): b is DealSearchRequest {
  if (!b || typeof b !== "object") return false;
  const r = b as Record<string, unknown>;
  return typeof r.name === "string" && r.name.trim().length > 0;
}

/**
 * POST /api/deals/search
 * Body: `DealSearchRequest`. Runs the configured enrichment provider via
 * `enrichDeal` and returns a typed `DealSearchResult`. Failures map to a status
 * + message the analysis error screen can show.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isSearchRequest(body)) {
    return Response.json({ error: "`name` is required" }, { status: 400 });
  }
  const ev = log
    .event("deals/search.request")
    .set("method", "POST")
    .set("path", "/api/deals/search")
    .set("provider", body.enrichmentProvider ?? "default");
  const t0 = Date.now();
  try {
    const result = await enrichDeal(body);
    ev.set("status", 200).set("durationMs", Date.now() - t0).emit();
    return Response.json(result);
  } catch (err) {
    const { status, error } = mapEnrichError(err);
    ev.set("status", status).set("durationMs", Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? "error" : "info");
    return Response.json({ error }, { status });
  }
}

/** Map an enrichment failure to an HTTP status + message for the error screen:
 *  unknown provider → 400; misconfig / timeout / vendor / unexpected-shape → 502. */
function mapEnrichError(err: unknown): { status: number; error: string } {
  if (err instanceof ZodError) {
    return { status: 502, error: "Enrichment returned an unexpected shape." };
  }
  if (err instanceof Error) {
    if (err.message.includes("Unknown enrichment provider")) {
      return { status: 400, error: err.message };
    }
    if (err.message.includes("CLASSIDY_WEBHOOK_URL is not set")) {
      return { status: 502, error: "Enrichment provider is not configured." };
    }
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { status: 502, error: "Enrichment provider timed out." };
    }
    if (err.message.startsWith("Classidy workflow failed")) {
      return { status: 502, error: err.message };
    }
  }
  return { status: 500, error: "Enrichment failed" };
}
