import { z } from "zod";
import { withAuth } from './_with-auth.js';

import { generatePreCallBrief } from "../src/lib/server/pre-call-brief-adapter.js";
import { mapApiError } from "../src/lib/server/api-error.js";
import { createLogger } from "../src/lib/server/logger.js";
import { getGladosToken } from "../src/lib/server/glados-auth.js";
import { LLM_PROVIDER } from "../src/lib/server/env.js";

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
    const gladosToken = LLM_PROVIDER === "glados"
      ? await getGladosToken(req, res)
      : undefined;
    const result = await generatePreCallBrief(parsed.data, gladosToken);
    log
      .event("pre-call-brief.request")
      .set("status", 200)
      .set("durationMs", Date.now() - t0)
      .set("count", result.hypotheses.length)
      .emit();
    res.status(200).json(result);
  } catch (err) {
    const { status, error } = mapApiError(err, {
      upstreamLabel: "Pre-call brief",
      fallback: "Pre-call brief generation failed",
    });
    const ev = log
      .event("pre-call-brief.request")
      .set("status", status)
      .set("durationMs", Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? "error" : "info");
    res.status(status).json({ error });
  }
});
