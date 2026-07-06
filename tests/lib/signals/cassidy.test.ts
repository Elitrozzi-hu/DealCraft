import { describe, expect, it, vi } from "vitest";

import { cassidyRawSignalsSchema, cassidySignalsProvider, toSignalsResult } from "@/lib/signals/providers/cassidy";
import { humandSignalsSchema } from "@/lib/llm/generations/company-signals/structured-output";

describe("cassidy signals provider", () => {
  it("throws when the webhook URL is not configured", async () => {
    await expect(
      cassidySignalsProvider.fetch({ company: "Acme", domain: "acme.com", language: "es" }),
    ).rejects.toThrow("CASSIDY_SIGNALS_WEBHOOK_URL is not set.");
  });
});

describe("cassidy signals request/response contract", () => {
  it("parses a humandSignalsSchema-shaped payload directly", () => {
    const payload = {
      company: "Acme",
      domain: "acme.com",
      signals: [
        {
          tier: 1,
          type: "funding",
          headline: "Acme raises Series C",
          date: "2026-03-01",
          summary: "Acme closed a $50M Series C round.",
          source_url: "https://example.com/acme-series-c",
          status: "verified",
          confidence: 0.9,
        },
      ],
    };

    const parsed = humandSignalsSchema.parse(payload);
    expect(parsed.signals).toHaveLength(1);
    expect(parsed.signals[0].type).toBe("funding");
  });
});

describe("toSignalsResult (raw Cassidy Title-Case payload)", () => {
  const input = { company: "Acme", domain: "acme.com", language: "es" as const };

  it("maps a raw Title-Case payload into the humandSignalsSchema contract", () => {
    const raw = cassidyRawSignalsSchema.parse({
      Domain: "acme.com",
      Company: "Acme",
      Signals: [
        {
          Date: "2026-02-11",
          Tier: 2,
          Type: "esg_dei",
          Status: "verified",
          Summary: "Acme committed to a DEI program.",
          Headline: "Acme's DEI commitment",
          Confidence: 0.9,
          "Source URL": "https://acme.com/dei",
        },
      ],
    });

    const result = humandSignalsSchema.parse(toSignalsResult(raw, input));
    expect(result.company).toBe("Acme");
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0]).toMatchObject({ tier: 2, type: "esg_dei", status: "verified" });
  });

  it("drops signals with an invalid tier or type instead of failing the whole batch", () => {
    const raw = cassidyRawSignalsSchema.parse({
      Domain: "acme.com",
      Company: "Acme",
      Signals: [
        { Tier: 2, Type: "esg_dei", Headline: "Valid signal", "Source URL": "https://acme.com/a" },
        { Tier: 0, Type: "esg_dei", Headline: "Bad tier" },
        { Tier: 1, Type: "not_a_real_type", Headline: "Bad type" },
      ],
    });

    const onDropped = vi.fn();
    const result = humandSignalsSchema.parse(toSignalsResult(raw, input, onDropped));

    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].headline).toBe("Valid signal");
    expect(onDropped).toHaveBeenCalledTimes(2);
  });

  it("defaults an unrecognized Status to inferred", () => {
    const raw = cassidyRawSignalsSchema.parse({
      Signals: [{ Tier: 1, Type: "funding", Status: "validated" }],
    });
    const result = humandSignalsSchema.parse(toSignalsResult(raw, input));
    expect(result.signals[0].status).toBe("inferred");
  });

  it("falls back to input company/domain and empty signals for an empty payload", () => {
    const raw = cassidyRawSignalsSchema.parse({});
    const result = humandSignalsSchema.parse(toSignalsResult(raw, input));
    expect(result.company).toBe("Acme");
    expect(result.domain).toBe("acme.com");
    expect(result.signals).toEqual([]);
  });
});
