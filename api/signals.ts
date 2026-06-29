import { z } from "zod";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { fetchSignals } from "@/lib/server/signals-adapter";
import { createLogger } from "@/lib/server/logger";

// Web search + structured LLM call can take 30–60s.
export const config = { maxDuration: 120 };

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
    const result = await fetchSignals(parsed.data.company, parsed.data.domain);
    log
      .event("signals.request")
      .set("status", 200)
      .set("durationMs", Date.now() - t0)
      .set("count", result.signals.length)
      .emit();
    res.status(200).json(result);
  } catch (err) {
    log
      .event("signals.request")
      .set("status", 500)
      .set("durationMs", Date.now() - t0)
      .setError(err)
      .emit("error");
    res.status(500).json({ error: "Signals research failed" });
  }
}
