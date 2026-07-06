import { describe, expect, it } from "vitest";

import { unwrapEnvelope } from "@/lib/cassidy-envelope";

function envelope(output: unknown): unknown {
  return { workflowRun: { actionResults: [{ name: "step", output }] } };
}

describe("unwrapEnvelope", () => {
  it("parses a plain JSON object output", () => {
    expect(unwrapEnvelope(envelope('{"a":1}'))).toEqual({ a: 1 });
  });

  it("strips a ```json code fence", () => {
    expect(unwrapEnvelope(envelope('```json\n{"a":1}\n```'))).toEqual({ a: 1 });
  });

  it("strips stray leading prose before a JSON object", () => {
    expect(unwrapEnvelope(envelope('CUTOFF: 2026-01-06\n{"a":1}'))).toEqual({ a: 1 });
  });

  it("parses a top-level JSON array without truncating it", () => {
    expect(unwrapEnvelope(envelope('[{"a":1},{"b":2}]'))).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("strips stray leading prose before a JSON array", () => {
    expect(unwrapEnvelope(envelope('CUTOFF: 2026-01-06\n[{"a":1}]'))).toEqual([{ a: 1 }]);
  });

  it("falls back to the raw envelope when the output can't be parsed as JSON", () => {
    const raw = envelope("not json at all");
    expect(unwrapEnvelope(raw)).toBe(raw);
  });

  it("passes through input with no envelope shape", () => {
    const raw = { foo: "bar" };
    expect(unwrapEnvelope(raw)).toBe(raw);
  });
});
