import type { SignalsRequest } from "@/types";
import { fetchSignals } from "@/lib/server/signals-adapter";
import { createLogger } from "@/lib/server/logger";

// Web search + structured LLM call can take 30–60s.
export const maxDuration = 120;

const log = createLogger("signals/route");

function isValidRequest(b: unknown): b is SignalsRequest {
  if (!b || typeof b !== "object") return false;
  const r = b as Record<string, unknown>;
  return typeof r.company === "string" && r.company.trim().length > 0;
}

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
  if (!isValidRequest(body)) {
    return Response.json({ error: "`company` is required" }, { status: 400 });
  }

  const t0 = Date.now();
  try {
    const result = await fetchSignals(
      body.company.trim(),
      (body.domain ?? "").trim(),
    );
    log
      .event("signals.request")
      .set("status", 200)
      .set("durationMs", Date.now() - t0)
      .set("count", result.signals.length)
      .emit();
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log
      .event("signals.request")
      .set("status", 500)
      .set("durationMs", Date.now() - t0)
      .setError(err)
      .emit("error");
    return Response.json({ error: `Signals research failed: ${message}` }, { status: 500 });
  }
}
