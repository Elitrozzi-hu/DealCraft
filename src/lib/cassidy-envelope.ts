import { z } from "zod";

// Shared Cassidy workflow-envelope unwrap (lib-root so both lib/enrichment and
// lib/server can import it). The final data is a JSON string — usually ```json-fenced
// — at `workflowRun.actionResults[].output`; unwrap to the bare object, or pass the
// input through if there's no envelope. `output` is `unknown`, not `string`:
// multi-step workflows emit object outputs on intermediate actions, and a string
// type made zod reject the whole envelope (the runtime check below picks the string).
const envelopeSchema = z
  .object({
    workflowRun: z
      .object({
        actionResults: z
          .array(
            z.object({
              name: z.string().nullish(),
              output: z.unknown(),
            }),
          )
          .nullish(),
      })
      .nullish(),
  })
  .nullish();


/** Strip a leading/trailing ```json … ``` (or plain ```) code fence, and drop
 *  any stray prose Cassidy sometimes prepends before the JSON payload (e.g. a
 *  "CUTOFF: 2026-01-06" line) by cutting to the first top-level `{` or `[`,
 *  whichever comes first. Left alone if the body already starts with valid
 *  JSON, so `[{"a":1},{"b":2}]` isn't misread as starting at the first
 *  object's `{`. */
function stripCodeFence(s: string): string {
  const trimmed = s.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  const body = fenced ? fenced[1].trim() : trimmed;
  if (body.startsWith("{") || body.startsWith("[")) return body;
  const starts = [body.indexOf("{"), body.indexOf("[")].filter((i) => i >= 0);
  return starts.length ? body.slice(Math.min(...starts)) : body;
}

/** Unwrap Cassidy's workflow envelope to the bare data object. */
export function unwrapEnvelope(raw: unknown): unknown {
  const env = envelopeSchema.safeParse(raw);
  const actionResults = env.success ? env.data?.workflowRun?.actionResults : null;
  if (!actionResults?.length) return raw;
  const action =
    actionResults.find((a) => typeof a.output === "string" && a.output.trim()) ??
    actionResults[0];
  const output = action?.output;
  if (typeof output !== "string" || !output.trim()) return raw;
  try {
    return JSON.parse(stripCodeFence(output));
  } catch {
    return raw;
  }
}
