import { z } from "zod";

import { GLADOS_API_URL } from "../../server/env.js";
import type { CommonOptions, GenerationProvider } from "../types.js";

export const gladosProvider: GenerationProvider = {
  name: "glados",
  async generate(opts: CommonOptions & { schema?: z.ZodType }): Promise<unknown> {
    if (opts.schema) return callGladosExtract(opts as CommonOptions & { schema: z.ZodType });
    return callGlados(opts);
  },
};

async function callGlados(opts: CommonOptions): Promise<string> {
  if (!opts.gladosToken) {
    throw Object.assign(
      new Error(
        "GLaDOS token required — call getGladosToken(req, res) in your BFF handler and pass the result as `gladosToken`.",
      ),
      { statusCode: 401 },
    );
  }
  if (!GLADOS_API_URL) throw new Error("GLADOS_API_URL is not set");

  type GladosMessage = { role: string; content: string };
  let messages: GladosMessage[];

  if (opts.messages && opts.messages.length > 0) {
    messages = opts.messages.flatMap((m): GladosMessage[] => {
      const content = typeof m.content === "string" ? m.content : "";
      return content !== undefined ? [{ role: m.role as string, content }] : [];
    });
  } else {
    messages = [];
    if (opts.system) messages.push({ role: "system", content: opts.system });
    if (opts.prompt) messages.push({ role: "user", content: opts.prompt });
  }

  const gladosRes = await fetch(`${GLADOS_API_URL}/v1/public/calls`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.gladosToken}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!gladosRes.ok) {
    const detail = await gladosRes.json().catch(() => ({}));
    throw Object.assign(
      new Error(`GLaDOS responded ${gladosRes.status}`),
      { statusCode: gladosRes.status >= 500 ? 502 : gladosRes.status, detail },
    );
  }

  const data = await gladosRes.json() as {
    content: string;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const inputTokens = data.usage?.input_tokens;
  const outputTokens = data.usage?.output_tokens;
  opts.onUsage?.({
    model: "glados",
    inputTokens,
    outputTokens,
    totalTokens:
      inputTokens !== undefined && outputTokens !== undefined
        ? inputTokens + outputTokens
        : undefined,
  });
  opts.onResponse?.({ text: data.content, response: data, providerMetadata: {}, usage: data.usage });

  return data.content;
}

export interface GladosExtractRequestBody {
  instructions: string;
  content: Array<{ type: "text"; text: string }>;
  schema: unknown;
  model_size?: string;
  attribution?: { tag: string };
}

/** Pure request-body builder for `POST /v1/public/tasks/extract`, tested directly. */
export function buildGladosExtractRequestBody(
  opts: CommonOptions,
  jsonSchema: unknown,
): GladosExtractRequestBody {
  let text: string;
  if (opts.prompt !== undefined || opts.system !== undefined) {
    text = opts.prompt ?? "";
  } else {
    text = (opts.messages ?? [])
      .map((m) => (typeof m.content === "string" ? m.content : ""))
      .filter((c) => c !== "")
      .join("\n\n");
  }

  return {
    instructions: opts.system ?? "",
    content: [{ type: "text", text }],
    schema: jsonSchema,
    model_size: opts.tier,
    ...(opts.attributionTag ? { attribution: { tag: opts.attributionTag } } : {}),
  };
}

async function callGladosExtract<T extends z.ZodType>(
  opts: CommonOptions & { schema: T },
): Promise<z.infer<T>> {
  if (!opts.gladosToken) {
    throw Object.assign(
      new Error(
        "GLaDOS token required — call getGladosToken(req, res) in your BFF handler and pass the result as `gladosToken`.",
      ),
      { statusCode: 401 },
    );
  }
  if (!GLADOS_API_URL) throw new Error("GLADOS_API_URL is not set");

  const jsonSchema = z.toJSONSchema(opts.schema);
  const body = buildGladosExtractRequestBody(opts, jsonSchema);

  const gladosRes = await fetch(`${GLADOS_API_URL}/v1/public/tasks/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.gladosToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!gladosRes.ok) {
    const detail = await gladosRes.json().catch(() => ({}));
    throw Object.assign(
      new Error(`GLaDOS responded ${gladosRes.status}`),
      { statusCode: gladosRes.status >= 500 ? 502 : gladosRes.status, detail },
    );
  }

  const data = await gladosRes.json() as {
    data: unknown;
    model?: string;
    provider?: string;
    cost?: { total?: number };
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  };

  opts.onUsage?.({
    model: data.model ?? "glados",
    provider: data.provider,
    inputTokens: data.usage?.promptTokens,
    outputTokens: data.usage?.completionTokens,
    totalTokens: data.usage?.totalTokens,
    costUsd: typeof data.cost?.total === "number" ? data.cost.total : undefined,
  });
  opts.onResponse?.({ object: data.data, response: data, providerMetadata: {}, usage: data.usage });

  return opts.schema.parse(data.data) as z.infer<T>;
}
