import { z } from "zod";

import { generate } from "@/lib/llm/generate";
import type { LlmProvider } from "@/lib/llm/registry";
import { createLogger } from "@/lib/server/logger";

export const maxDuration = 60;

const log = createLogger("chat");

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
  provider: z.string().optional(),
  model: z.string().optional(),
});

/**
 * POST /api/chat
 * Body: `{ messages: {role, content}[], provider?, model? }`.
 * Non-streaming: runs the messages through the LLM abstraction and returns
 * `{ text }`. The active model/provider is swappable via env or per request.
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { messages, provider, model } = parsed.data;
  const ev = log
    .event("chat.request")
    .set("method", "POST")
    .set("path", "/api/chat")
    .set("provider", provider ?? "default");
  const t0 = Date.now();
  try {
    const text = await generate({
      provider: provider as LlmProvider | undefined,
      model,
      messages,
    });
    ev.set("status", 200).set("durationMs", Date.now() - t0).emit();
    return Response.json({ text });
  } catch (err) {
    const { status, error } = mapLlmError(err);
    ev.set("status", status).set("durationMs", Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? "error" : "info");
    return Response.json({ error }, { status });
  }
}

/** Map a `generate` failure to an HTTP status: unknown provider → 400,
 *  rate-limit → 429, everything else → 500. */
function mapLlmError(err: unknown): { status: number; error: string } {
  if (err instanceof Error && err.message.includes("Unknown LLM provider")) {
    return { status: 400, error: "Requested LLM provider is not available" };
  }
  if (
    err &&
    typeof err === "object" &&
    "statusCode" in err &&
    (err as { statusCode?: number }).statusCode === 429
  ) {
    return { status: 429, error: "Rate limited by the LLM provider" };
  }
  return { status: 500, error: "LLM generation failed" };
}
