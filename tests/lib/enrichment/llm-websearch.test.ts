import { describe, expect, it } from "vitest";

import {
  asSourceUrl,
  buildQuery,
  fromLlmProv,
  normalize,
  stakeholderProv,
} from "@/lib/enrichment/providers/llm-websearch";
import type { EnrichmentInput } from "@/lib/enrichment/types";
import type {
  LlmProvenance,
  LlmResearchOutput,
} from "@/lib/llm/generations/company-research/structured-output";

const prov = (over: Partial<LlmProvenance> = {}): LlmProvenance => ({
  source: null,
  sourceUrl: null,
  confidence: 0.5,
  status: "inferred",
  ...over,
});

describe("llm-websearch asSourceUrl", () => {
  it("accepts http(s) and strips the www. label", () => {
    expect(asSourceUrl("https://www.acme.com/about")).toEqual({
      href: "https://www.acme.com/about",
      label: "acme.com",
    });
    expect(asSourceUrl("http://acme.io/x")?.label).toBe("acme.io");
  });

  it("rejects non-http(s) protocols, malformed urls and null", () => {
    expect(asSourceUrl("ftp://acme.com")).toBeNull();
    expect(asSourceUrl("not a url")).toBeNull();
    expect(asSourceUrl(null)).toBeNull();
  });
});

describe("llm-websearch buildQuery", () => {
  const input = (over: Partial<EnrichmentInput> = {}): EnrichmentInput => over;

  it("combines company name and domain", () => {
    expect(buildQuery(input({ companyName: "Acme", domain: "acme.com" }))).toBe(
      "Acme acme.com company enrichment profile",
    );
  });

  it("works with only one field", () => {
    expect(buildQuery(input({ companyName: "Acme" }))).toBe(
      "Acme company enrichment profile",
    );
  });

  it("falls back when neither is present", () => {
    expect(buildQuery(input())).toBe("company enrichment profile");
  });
});

describe("llm-websearch stakeholderProv", () => {
  it("maps each status to its computed confidence", () => {
    expect(stakeholderProv(null, "validated").confidence).toBe(0.9);
    expect(stakeholderProv(null, "inferred").confidence).toBe(0.5);
    expect(stakeholderProv(null, "cold").confidence).toBe(0.2);
  });

  it("surfaces a link + hostname label only for a validated real url", () => {
    const p = stakeholderProv("https://linkedin.com/in/x", "validated");
    expect(p.url).toBe("https://linkedin.com/in/x");
    expect(p.source).toBe("linkedin.com");
  });

  it("never surfaces a link for non-validated status", () => {
    const p = stakeholderProv("https://linkedin.com/in/x", "inferred");
    expect(p.url).toBeUndefined();
    expect(p.source).toBe("Web research");
  });
});

describe("llm-websearch fromLlmProv", () => {
  it("clamps confidence into [0,1]", () => {
    expect(fromLlmProv(prov({ confidence: 1.5 })).confidence).toBe(1);
    expect(fromLlmProv(prov({ confidence: -0.5 })).confidence).toBe(0);
  });

  it("prefers sourceUrl over source for the link (validated only)", () => {
    const p = fromLlmProv(
      prov({
        source: "https://a.com/x",
        sourceUrl: "https://b.com/page",
        status: "validated",
      }),
    );
    expect(p.url).toBe("https://b.com/page");
  });

  it("shows a tidy hostname when source itself is a url", () => {
    expect(fromLlmProv(prov({ source: "https://www.foo.com/p" })).source).toBe(
      "foo.com",
    );
  });

  it("never surfaces a link for an inferred field", () => {
    const p = fromLlmProv(prov({ sourceUrl: "https://b.com/page", status: "inferred" }));
    expect(p.url).toBeUndefined();
  });
});

describe("llm-websearch normalize", () => {
  const base: LlmResearchOutput = {
    summary: { value: "", provenance: prov() },
    region: { value: "LATAM", provenance: prov({ status: "validated" }) },
    headcount: { value: 200.6, provenance: prov() },
    workforcePercentage: { value: 150, provenance: prov() },
    techStack: [],
    stakeholders: [
      { name: "Jane", title: "CHRO", decisionRole: "Decision Maker", email: null, sourceUrl: null, status: "inferred" },
      { name: null, title: "CFO", decisionRole: null, email: null, sourceUrl: null, status: "inferred" },
      { name: null, title: null, decisionRole: null, email: null, sourceUrl: null, status: "cold" },
    ],
    painPoints: [],
  };

  it("replaces an empty summary with the '—' cold placeholder", () => {
    const out = normalize(base);
    expect(out.summary.value).toBe("—");
    expect(out.summary.prov.status).toBe("cold");
  });

  it("clamps workforce to [0,100] and rounds headcount", () => {
    const out = normalize(base);
    expect(out.workforcePercentage?.value).toBe(100);
    expect(out.headcount?.value).toBe(201);
  });

  it("keeps stakeholders with any identifying field, drops the fully-empty one", () => {
    const out = normalize(base);
    expect(out.stakeholders).toHaveLength(2);
    expect(out.stakeholders.map((s) => s.title)).toEqual(["CHRO", "CFO"]);
  });
});
