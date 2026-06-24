import type { MaterialsRequest } from "@/types";
import { generateMaterials } from "@/lib/server/materials-adapter";
import { createLogger } from "@/lib/server/logger";

const log = createLogger("materials");

function isMaterialsRequest(b: unknown): b is MaterialsRequest {
  if (!b || typeof b !== "object") return false;
  const r = b as Record<string, unknown>;
  return (
    typeof r.companyName === "string" &&
    Array.isArray(r.pains) &&
    Array.isArray(r.stakeholders) &&
    typeof r.includePricing === "boolean" &&
    typeof r.mrr === "number" &&
    typeof r.mrrConfirmed === "boolean"
  );
}

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
  if (!isMaterialsRequest(body)) {
    return Response.json(
      {
        error:
          "`companyName`, `pains`, `stakeholders`, `includePricing`, `mrr`, `mrrConfirmed` are required",
      },
      { status: 400 },
    );
  }
  const ev = log
    .event("materials.request")
    .set("method", "POST")
    .set("path", "/api/materials");
  const t0 = Date.now();
  try {
    const result = await generateMaterials(body);
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
