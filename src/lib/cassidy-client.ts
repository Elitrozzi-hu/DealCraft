import { unwrapEnvelope } from "./cassidy-envelope.js";

// Shared low-level client for calling a CassidyAI workflow webhook. Each
// enrichment provider (cassidy, ...) owns its own
// request/response contract and webhook URL/key; this only handles the fetch,
// timeout, and envelope-unwrap plumbing they all share.

const DEFAULT_TIMEOUT_MS = 290_000;

export interface CallCassidyWebhookOptions {
  url: string;
  apiKey: string | undefined;
  body: unknown;
  timeoutMs?: number;
}

/** POST `body` to a Cassidy workflow webhook and return the envelope-unwrapped JSON. */
export async function callCassidyWebhook(opts: CallCassidyWebhookOptions): Promise<unknown> {
  const res = await fetch(opts.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey ?? ""}`,
    },
    body: JSON.stringify(opts.body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Cassidy workflow failed: ${res.status}`);
  }

  const raw: unknown = await res.json();
  return unwrapEnvelope(raw);
}
