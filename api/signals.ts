import { z } from "zod";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { fetchSignals } from "@/lib/server/signals-adapter";
import { mapApiError } from "@/lib/server/api-error";
import { createLogger } from "@/lib/server/logger";

// Web search + structured LLM call can take 30–60s.
export const config = { maxDuration: 120 };

const log = createLogger("signals/route");

const bodySchema = z.object({
  company: z.string().trim().min(1, "`company` is required"),
  domain: z.string().trim().optional().default(""),
  language: z.enum(["es", "en"]).optional().default("es"),
});


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
    const result = await fetchSignals(
      parsed.data.company,
      parsed.data.domain,
      parsed.data.language,
    );
    log
      .event("signals.request")
      .set("status", 200)
      .set("durationMs", Date.now() - t0)
      .set("count", result.signals.length)
      .emit();
    res.status(200).json(result);
  } catch (err) {
    const { status, error } = mapApiError(err, {
      upstreamLabel: "Signals",
      fallback: "Signals research failed",
    });
    const ev = log
      .event("signals.request")
      .set("status", status)
      .set("durationMs", Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? "error" : "info");
    res.status(status).json({ error });
  }
}
