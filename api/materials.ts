import { z } from "zod";
import { withAuth } from './_with-auth.js';

import type { Pain, Stakeholder } from "../src/types/index.js";
import { generateMaterials } from "../src/lib/server/materials-adapter.js";
import { mapApiError } from "../src/lib/server/api-error.js";
import { createLogger } from "../src/lib/server/logger.js";

const log = createLogger("materials");

const bodySchema = z.object({
  companyName: z.string().min(1, "`companyName` is required"),
  pains: z.array(z.custom<Pain>()).max(50),
  stakeholders: z.array(z.custom<Stakeholder>()).max(50),
  includePricing: z.boolean(),
  mrr: z.number(),
  mrrConfirmed: z.boolean(),
});

/**
 * POST /api/materials
 * Body: `MaterialsRequest`. Returns a typed `MaterialsResult` with the 5 sales
 * artifacts as structured stubs (behind the `generateMaterials` LLM seam).
 */
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
  const ev = log
    .event("materials.request")
    .set("method", "POST")
    .set("path", "/api/materials");
  const t0 = Date.now();
  try {
    const result = await generateMaterials(parsed.data);
    ev.set("status", 200).set("durationMs", Date.now() - t0).emit();
    res.status(200).json(result);
  } catch (err) {
    const { status, error } = mapApiError(err, {
      upstreamLabel: "Materials",
      fallback: "Materials generation failed",
    });
    ev.set("status", status).set("durationMs", Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? "error" : "info");
    res.status(status).json({ error });
  }
});
