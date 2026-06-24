import { generatePresentation, ValidationError } from "@/lib/ppt";
import { createLogger } from "@/lib/server/logger";

// `lib/ppt` reads the `.pptx` template from `deck-assets/` (node:fs +
// process.cwd()) and zips with jszip, so this route cannot run on Edge.
export const runtime = "nodejs";

const log = createLogger("generate-ppt");

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

// RFC 6266: an ASCII-sanitized filename (also guards against header injection)
// plus a UTF-8 variant so accented client names survive.
function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * POST /api/generate-ppt
 * Body: a JSON object of deck token values (`DeckRequest`-shaped). Recognized:
 * clientName, date, logo and the pricing tokens. Any {{token}} in the deck
 * template is filled from the matching property.
 *
 * TODO: the materials feature will supply deal-derived tokens — map the deal
 * (validated pains / confirmed MRR / company) into this token payload at that
 * layer, not here.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ev = log
    .event("generate-ppt.request")
    .set("method", "POST")
    .set("path", "/api/generate-ppt");
  const t0 = Date.now();
  try {
    const { data, filename } = await generatePresentation(body);
    ev.set("status", 200).set("durationMs", Date.now() - t0).emit();
    return new Response(data, {
      headers: {
        "Content-Type": PPTX_MIME,
        "Content-Disposition": contentDisposition(filename),
      },
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      ev.set("status", 400).set("durationMs", Date.now() - t0).emit("warn");
      return Response.json({ error: err.message }, { status: 400 });
    }
    ev.set("status", 500).set("durationMs", Date.now() - t0).setError(err).emit("error");
    return Response.json(
      { error: "Failed to generate presentation" },
      { status: 500 },
    );
  }
}
