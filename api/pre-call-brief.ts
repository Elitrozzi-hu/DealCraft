import { z } from "zod";
import { withAuth } from './_with-auth.js';

import { generatePreCallBrief } from "../src/lib/server/pre-call-brief-adapter.js";
import { mapApiError } from "../src/lib/server/api-error.js";
import { createLogger } from "../src/lib/server/logger.js";
import { getGladosTokenIfNeeded } from "../src/lib/server/glados-auth.js";
import { PRE_CALL_BRIEF_PROVIDER } from "../src/lib/constants.js";

// Single structured LLM call (no web search) — default route timeout is enough.

const log = createLogger("pre-call-brief/route");

const stakeholderSchema = z.object({
  name: z.string().default(""),
  title: z.string().default(""),
  role: z.string().default(""),
});

const comparableCaseSchema = z.object({
  company: z.string().default(""),
  industry: z.string().default(""),
  pains: z.array(z.string()).default([]),
  modules: z.array(z.string()).default([]),
  metrics: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .default([]),
  quote: z.string().nullable().default(null),
  sourceUrl: z.string().nullable().default(null),
});

const bodySchema = z.object({
  company: z.string().trim().min(1, "`company` is required"),
  hubspotDealId: z.string().trim().min(1).nullish(),
  industry: z.string().trim().optional().default(""),
  region: z.string().trim().optional().default(""),
  headcount: z.string().trim().optional().default(""),
  stakeholders: z.array(stakeholderSchema).max(50).optional().default([]),
  comparableCases: z.array(comparableCaseSchema).max(50).optional().default([]),
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

  const t0 = Date.now();
  try {
    const gladosToken = await getGladosTokenIfNeeded(req, res, PRE_CALL_BRIEF_PROVIDER);
    const result = await generatePreCallBrief(
      { ...parsed.data, hubspotDealId: parsed.data.hubspotDealId ?? null },
      gladosToken,
    );
    log
      .event("pre-call-brief.request")
      .set("provider", PRE_CALL_BRIEF_PROVIDER)
      .set("status", 200)
      .set("durationMs", Date.now() - t0)
      .set("count", result.hypotheses.length)
      .emit();
    res.status(200).json(result);
  } catch (err) {
    const { status, error } = mapApiError(err, {
      rules: (e) => {
        if (!(e instanceof Error) || !("statusCode" in e) || !("detail" in e)) return undefined;
        const code = (e as { detail?: { error?: { code?: string } } }).detail?.error?.code;
        switch (code) {
          case "scope_insufficient":
            return { status: 403, error: "glados_scope_insufficient" };
          case "validation_error":
            return { status: 400, error: "glados_validation_error" };
          case "spend_limit_exceeded":
            return { status: 402, error: "glados_spend_limit_exceeded" };
          case "jwt_expired":
            return { status: 401, error: "glados_jwt_expired" };
          case "all_providers_failed":
            return { status: 502, error: "glados_all_providers_failed" };
          default:
            return undefined;
        }
      },
      upstreamLabel: "Pre-call brief",
      fallback: "Pre-call brief generation failed",
    });
    const ev = log
      .event("pre-call-brief.request")
      .set("provider", PRE_CALL_BRIEF_PROVIDER)
      .set("status", status)
      .set("durationMs", Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? "error" : "info");
    res.status(status).json({ error });
  }
});
