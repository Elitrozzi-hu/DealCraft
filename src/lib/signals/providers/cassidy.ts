import { z } from "zod";

import { callCassidyWebhook } from "../../cassidy-client.js";
import { CASSIDY_API_KEY, CASSIDY_SIGNALS_WEBHOOK_URL } from "../../server/env.js";
import { createLogger } from "../../server/logger.js";
import { humandSignalsSchema } from "../../llm/generations/company-signals/structured-output.js";
import { SIGNAL_TYPES } from "../../../types/index.js";
import type { SignalsInput, SignalsProvider, SignalsProviderResult } from "../types.js";
import type { SignalItem, SignalsResult } from "../../../types/index.js";

// This provider drives the `company-signals` task through a CassidyAI workflow
// webhook. Cassidy's raw JSON uses Title-Case keys (`Domain`, `Company`,
// `Signals[]` with `Tier`/`Type`/`Headline`/`Date`/`Summary`/`Source URL`/
// `Status`/`Confidence`) — `toSignalsResult` below translates that into the
// `humandSignalsSchema` contract (same field values/enums, just snake_case and
// lowercase keys), matching the same translation pattern used by the
// company-research `cassidy.ts` provider.

// `/api/signals` runs with `maxDuration: 120` (see api/signals.ts); keep the
// webhook call comfortably under that so a slow workflow surfaces as a clean
// "Cassidy workflow failed" abort instead of Vercel hard-killing the function.
const SIGNALS_TIMEOUT_MS = 100_000;

interface SignalsRequestBody {
  companyName: string | null;
  companyDomain: string | null;
  language: string;
}

function toRequestBody(input: SignalsInput): SignalsRequestBody {
  return {
    companyName: input.company || null,
    companyDomain: input.domain || null,
    language: input.language,
  };
}

const rawSignalItemSchema = z.object({
  Date: z.string().nullish(),
  Tier: z.number().nullish(),
  Type: z.string().nullish(),
  Status: z.string().nullish(),
  Summary: z.string().nullish(),
  Headline: z.string().nullish(),
  Confidence: z.number().nullish(),
  "Source URL": z.string().nullish(),
});

type RawSignalItem = z.infer<typeof rawSignalItemSchema>;

export const cassidyRawSignalsSchema = z
  .object({
    Domain: z.string().nullish(),
    Company: z.string().nullish(),
    Signals: z.array(rawSignalItemSchema).nullish(),
  })
  .passthrough();

type CassidyRawSignals = z.infer<typeof cassidyRawSignalsSchema>;

const VALID_TIERS = new Set([1, 2, 3]);
const VALID_TYPES = new Set<string>(SIGNAL_TYPES);

/** Translate one raw Cassidy signal item into a canonical `SignalItem`, or
 *  `null` if it fails to carry a valid tier/type — an external, vendor-filled
 *  webhook can't be trusted to always match our enums, so a single malformed
 *  item is dropped rather than throwing away the whole batch. */
function toSignalItem(s: RawSignalItem): SignalItem | null {
  const tier = VALID_TIERS.has(s.Tier ?? -1) ? (s.Tier as 1 | 2 | 3) : null;
  const type =
    typeof s.Type === "string" && VALID_TYPES.has(s.Type)
      ? (s.Type as SignalItem["type"])
      : null;
  if (tier === null || type === null) return null;
  return {
    tier,
    type,
    headline: s.Headline ?? "",
    date: s.Date ?? null,
    summary: s.Summary ?? "",
    source_url: s["Source URL"] ?? "",
    status: s.Status === "verified" ? "verified" : "inferred",
    confidence: s.Confidence ?? 0.5,
  };
}

/** Translate Cassidy's raw Title-Case response into the `humandSignalsSchema`
 *  contract. Exported for tests exercising the raw-to-canonical mapping
 *  directly. Invalid items (bad tier/type) are dropped and logged instead of
 *  failing the whole fetch. */
export function toSignalsResult(
  raw: CassidyRawSignals,
  input: SignalsInput,
  onDropped?: (item: RawSignalItem) => void,
): unknown {
  const signals: SignalItem[] = [];
  for (const item of raw.Signals ?? []) {
    const mapped = toSignalItem(item);
    if (mapped) {
      signals.push(mapped);
    } else {
      onDropped?.(item);
    }
  }
  return {
    company: raw.Company ?? input.company ?? "",
    domain: raw.Domain ?? input.domain ?? "",
    signals,
  };
}

const log = createLogger("signals/cassidy");

export const cassidySignalsProvider: SignalsProvider = {
  name: "cassidy",
  async fetch(input: SignalsInput): Promise<SignalsProviderResult> {
    if (!CASSIDY_SIGNALS_WEBHOOK_URL) {
      throw new Error("CASSIDY_SIGNALS_WEBHOOK_URL is not set.");
    }

    const unwrapped = await callCassidyWebhook({
      url: CASSIDY_SIGNALS_WEBHOOK_URL,
      apiKey: CASSIDY_API_KEY,
      body: toRequestBody(input),
      timeoutMs: SIGNALS_TIMEOUT_MS,
    });

    let data: SignalsResult;
    try {
      const raw = cassidyRawSignalsSchema.parse(unwrapped);
      data = humandSignalsSchema.parse(
        toSignalsResult(raw, input, (dropped) => {
          log.warn("dropped signal with invalid tier/type", {
            tier: dropped.Tier ?? null,
            type: dropped.Type ?? null,
          });
        }),
      );
    } catch (err) {
      log.error("parse failed", {
        topLevelKeys:
          unwrapped && typeof unwrapped === "object"
            ? Object.keys(unwrapped).join(",")
            : typeof unwrapped,
      });
      throw err;
    }

    return { data, usage: [] };
  },
};
