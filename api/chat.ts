import { z } from "zod";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { generate } from "@/lib/llm/generate";
import type { LlmProvider } from "@/lib/llm/registry";
import { createLogger } from "@/lib/server/logger";

export const config = { maxDuration: 60 };

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
    res.status(200).json({ text });
  } catch (err) {
    const { status, error } = mapLlmError(err);
    ev.set("status", status).set("durationMs", Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? "error" : "info");
    res.status(status).json({ error });
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
