import { z, ZodError } from "zod";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import type { LeadDeal } from "@/types";
import { enrichDeal } from "@/lib/server/deals-adapter";
import { createLogger } from "@/lib/server/logger";

// Cassidy's synchronous workflow can take several minutes; allow the function to
// outlive the default so it doesn't get killed before the fetch timeout (290s).
export const config = { maxDuration: 300 };

const log = createLogger("deals/search");

const bodySchema = z.object({
  name: z.string().trim().min(1, "`name` is required"),
  website: z.string().optional(),
  email: z.string().optional(),
  jobTitle: z.string().optional(),
  companyName: z.string().optional(),
  companyDomain: z.string().optional(),
  contactEmail: z.string().optional(),
  lifecycleStage: z.string().optional(),
  deal: z.custom<LeadDeal>().optional(),
  enrichmentProvider: z.string().optional(),
  benchmark: z.boolean().optional(),
});

/**
 * POST /api/deals/search
 * Body: `DealSearchRequest`. Runs the configured enrichment provider via
 * `enrichDeal` and returns a typed `DealSearchResult`. Failures map to a status
 * + message the analysis error screen can show.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }
  const reqData = parsed.data;
  const ev = log
    .event("deals/search.request")
    .set("method", "POST")
    .set("path", "/api/deals/search")
    // Per-request hint; overwritten with the resolved provider on success.
    .set("provider", reqData.enrichmentProvider ?? "default");
  const t0 = Date.now();
  try {
    const { provider, result, meta } = await enrichDeal(reqData);
    ev.set("provider", provider)
      .set("status", 200)
      .set("durationMs", Date.now() - t0)
      .emit();
    res.status(200).json(meta ? { ...result, _meta: meta } : result);
  } catch (err) {
    const { status, error } = mapEnrichError(err);
    ev.set("status", status).set("durationMs", Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? "error" : "info");
    res.status(status).json({ error });
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
