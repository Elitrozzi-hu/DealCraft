import { z } from "zod";

import { fetchSignals } from "@/lib/server/signals-adapter";
import { createLogger } from "@/lib/server/logger";

// Web search + structured LLM call can take 30–60s.
export const maxDuration = 120;

const log = createLogger("signals/route");

const bodySchema = z.object({
  company: z.string().trim().min(1, "`company` is required"),
  domain: z.string().trim().optional().default(""),
});

/**
 * POST /api/signals
 * Body: `SignalsRequest`. Runs a live web-search + structured LLM call and
 * returns `SignalsResult`. Non-2xx on missing input or provider failure.
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
    const result = await fetchSignals(parsed.data.company, parsed.data.domain);
    log
      .event("signals.request")
      .set("status", 200)
      .set("durationMs", Date.now() - t0)
      .set("count", result.signals.length)
      .emit();
    return Response.json(result);
  } catch (err) {
    log
      .event("signals.request")
      .set("status", 500)
      .set("durationMs", Date.now() - t0)
      .setError(err)
      .emit("error");
    return Response.json({ error: "Signals research failed" }, { status: 500 });
  }
}
