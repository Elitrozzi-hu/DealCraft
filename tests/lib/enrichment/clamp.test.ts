import { describe, expect, it } from "vitest";

import { clamp } from "@/lib/enrichment/clamp";

describe("clamp", () => {
  it("returns the value when within bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("floors to lo when below", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it("caps to hi when above", () => {
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it("is inclusive at both edges", () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});
