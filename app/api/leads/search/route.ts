import { z } from "zod";

import type { LeadSearchInput } from "@/lib/crm/types";
import { getCrmProvider } from "@/lib/crm/registry";
import { createLogger } from "@/lib/server/logger";

export const maxDuration = 60;

const log = createLogger("leads/search");

const bodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "`email` is required to search for a lead."),
  // Optional per-request provider override (e.g. "mock" for smoke tests);
  // the client omits it and lets `CRM_PROVIDER` decide.
  provider: z.string().optional(),
});

/**
 * POST /api/leads/search
 * Body: `{ email, provider? }`. Resolves the CRM provider (per-request
 * `provider` or the `CRM_PROVIDER` default) and returns a normalized
 * `LeadSearchResult`. The lead is searched by `email` only.
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { email, provider } = parsed.data;
  const input: LeadSearchInput = { email };

  // NOTE: never put `email` (or any contact field) on the event — PII.
  const ev = log
    .event("leads/search.request")
    .set("method", "POST")
    .set("path", "/api/leads/search")
    .set("provider", provider ?? "default");
  const t0 = Date.now();
  try {
    const result = await getCrmProvider(provider).searchLeads(input);
    ev
      .set("status", 200)
      .set("durationMs", Date.now() - t0)
      .set("candidates", result.total)
      .emit();
    return Response.json(result);
  } catch (err) {
    const { status, error } = mapLeadSearchError(err);
    ev.set("status", status).set("durationMs", Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? "error" : "info");
    return Response.json({ error }, { status });
  }
}

/** Map a lead-search failure to an HTTP status: unknown provider → 400,
 *  timeout/vendor failure → 502, else 500. */
function mapLeadSearchError(err: unknown): { status: number; error: string } {
  if (err instanceof Error) {
    if (err.message.includes("Unknown CRM provider")) {
      return { status: 400, error: err.message };
    }
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { status: 502, error: "CRM provider timed out" };
    }
    if (err.message.startsWith("HubSpot search failed")) {
      return { status: 502, error: err.message };
    }
  }
  return { status: 500, error: "Lead search failed" };
}
