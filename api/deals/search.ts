import { z } from "zod";
import { withAuth } from '../_with-auth.js';

import type { LeadDeal } from "../../src/types/index.js";
import { mapApiError, type ApiError } from "../../src/lib/server/api-error.js";
import { enrichDeal } from "../../src/lib/server/deals-adapter.js";
import { createLogger } from "../../src/lib/server/logger.js";

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
  language: z.enum(["es", "en"]).optional().default("es"),
});

export default withAuth(async (req, res, _session) => {
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
    const { status, error } = mapApiError(err, {
      upstreamLabel: "Enrichment",
      fallback: "Enrichment failed",
      rules: enrichRules,
    });
    ev.set("status", status).set("durationMs", Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? "error" : "info");
    res.status(status).json({ error });
  }
});

function enrichRules(err: unknown): ApiError | undefined {
  if (err instanceof Error) {
    if (err.message.includes("CLASSIDY_WEBHOOK_URL is not set")) {
      return { status: 502, error: "Enrichment provider is not configured." };
    }
    if (err.message.startsWith("Classidy workflow failed")) {
      return { status: 502, error: err.message };
    }
  }
  return undefined;
}
