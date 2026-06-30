import { z } from "zod";
import { withAuth } from './_with-auth.js';

import { generate } from "@/lib/llm/generate";
import type { LlmProvider } from "@/lib/llm/registry";
import { mapApiError } from "@/lib/server/api-error";
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
    .min(1)
    .max(10),
  provider: z.string().optional(),
  model: z.string().optional(),
});


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
    const { status, error } = mapApiError(err, {
      upstreamLabel: "LLM",
      fallback: "LLM generation failed",
    });
    ev.set("status", status).set("durationMs", Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? "error" : "info");
    res.status(status).json({ error });
  }
});
