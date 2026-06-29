import { z } from "zod";

import type { Pain, Stakeholder } from "@/types";
import { generateMaterials } from "@/lib/server/materials-adapter";
import { createLogger } from "@/lib/server/logger";

const log = createLogger("materials");

const bodySchema = z.object({
  companyName: z.string().min(1, "`companyName` is required"),
  pains: z.array(z.custom<Pain>()),
  stakeholders: z.array(z.custom<Stakeholder>()),
  includePricing: z.boolean(),
  mrr: z.number(),
  mrrConfirmed: z.boolean(),
});

/**
 * POST /api/materials
 * Body: `MaterialsRequest`. Returns a typed `MaterialsResult` with the 5 sales
 * artifacts as structured stubs (behind the `generateMaterials` LLM seam).
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
  const ev = log
    .event("materials.request")
    .set("method", "POST")
    .set("path", "/api/materials");
  const t0 = Date.now();
  try {
    const result = await generateMaterials(parsed.data);
    ev.set("status", 200).set("durationMs", Date.now() - t0).emit();
    return Response.json(result);
  } catch (err) {
    ev.set("status", 500).set("durationMs", Date.now() - t0).setError(err).emit("error");
    return Response.json(
      { error: "Materials generation failed" },
      { status: 500 },
    );
  }
}
