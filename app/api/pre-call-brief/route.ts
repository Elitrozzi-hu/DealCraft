import { z } from "zod";

import { generatePreCallBrief } from "@/lib/server/pre-call-brief-adapter";
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
  stakeholders: z.array(stakeholderSchema).optional().default([]),
  comparableCases: z.array(comparableCaseSchema).optional().default([]),
});

/**
 * POST /api/pre-call-brief
 * Body: `PreCallBriefRequest`. Runs a single structured LLM call and returns
 * `PreCallBriefResult`. Non-2xx on missing input or provider failure.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 },
    );
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
    return Response.json(result);
  } catch (err) {
    log
      .event("pre-call-brief.request")
      .set("status", 500)
      .set("durationMs", Date.now() - t0)
      .setError(err)
      .emit("error");
    return Response.json(
      { error: "Pre-call brief generation failed" },
      { status: 500 },
    );
  }
}
