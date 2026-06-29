import { z } from "zod";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { generatePreCallBrief } from "@/lib/server/pre-call-brief-adapter";
import { mapApiError } from "@/lib/server/api-error";
import { createLogger } from "@/lib/server/logger";

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
});

/**
 * POST /api/pre-call-brief
 * Body: `PreCallBriefRequest`. Runs a single structured LLM call and returns
 * `PreCallBriefResult`. Non-2xx on missing input or provider failure.
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

  const t0 = Date.now();
  try {
    const result = await generatePreCallBrief(parsed.data);
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
}
