import type { VercelRequest, VercelResponse } from "@vercel/node";

import { generatePresentation, ValidationError } from "@/lib/ppt";
import { createLogger } from "@/lib/server/logger";

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
 * template is filled from the matching property. `lib/ppt` reads the `.pptx`
 * template from `deck-assets/` (node:fs + process.cwd()) and zips with jszip,
 * so this runs on the Node runtime (default) — the template is bundled via
 * `vercel.json` `functions[...].includeFiles`.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const ev = log
    .event("generate-ppt.request")
    .set("method", "POST")
    .set("path", "/api/generate-ppt");
  const t0 = Date.now();
  try {
    const { data, filename } = await generatePresentation(req.body);
    ev.set("status", 200).set("durationMs", Date.now() - t0).emit();
    res.setHeader("Content-Type", PPTX_MIME);
    res.setHeader("Content-Disposition", contentDisposition(filename));
    res.status(200).send(Buffer.from(data));
  } catch (err) {
    if (err instanceof ValidationError) {
      ev.set("status", 400).set("durationMs", Date.now() - t0).emit("warn");
      res.status(400).json({ error: err.message });
      return;
    }
    ev.set("status", 500)
      .set("durationMs", Date.now() - t0)
      .setError(err)
      .emit("error");
    res.status(500).json({ error: "Failed to generate presentation" });
  }
}
