import { z } from "zod";
import { withAuth } from '../_with-auth.js';

import type { LeadSearchInput } from "../../src/lib/crm/types.js";
import { getCrmProvider } from "../../src/lib/crm/registry.js";
import { mapApiError, type ApiError } from "../../src/lib/server/api-error.js";
import { createLogger } from "../../src/lib/server/logger.js";

export const config = { maxDuration: 60 };

const log = createLogger("leads/search");

const bodySchema = z.object({
  email: z.string().trim().min(1, "`email` is required to search for a lead."),

  provider: z.string().optional(),
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

  const { email, provider } = parsed.data;
  const input: LeadSearchInput = { email };

  const ev = log
    .event("leads/search.request")
    .set("method", "POST")
    .set("path", "/api/leads/search")
    .set("provider", provider ?? "default");
  const t0 = Date.now();
  try {
    const result = await getCrmProvider(provider).searchLeads(input);
    ev.set("status", 200)
      .set("durationMs", Date.now() - t0)
      .set("candidates", result.total)
      .emit();
    res.status(200).json(result);
  } catch (err) {
    const { status, error } = mapApiError(err, {
      upstreamLabel: "CRM",
      fallback: "Lead search failed",
      rules: leadSearchRules,
    });
    ev.set("status", status).set("durationMs", Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? "error" : "info");
    res.status(status).json({ error });
  }
});

function leadSearchRules(err: unknown): ApiError | undefined {
  if (err instanceof Error && err.message.startsWith("HubSpot search failed")) {
    return { status: 502, error: err.message };
  }
  return undefined;
}
