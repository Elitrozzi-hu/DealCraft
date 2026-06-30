import { describe, expect, it } from "vitest";

import {
  normalize,
  toKind,
  toProv,
  toTechItems,
} from "@/lib/enrichment/providers/classidy";

// `normalize`/`toProv` consume the module-private CassidyRaw / RawProv shapes;
// reference them via Parameters<> so tests don't depend on exported type names.
type CassidyRaw = Parameters<typeof normalize>[0];
type RawProv = Parameters<typeof toProv>[0];

describe("classidy toKind", () => {
  it("passes through the three known kinds", () => {
    expect(toKind("desplazar")).toBe("desplazar");
    expect(toKind("integrar")).toBe("integrar");
    expect(toKind("coexistir")).toBe("coexistir");
  });

  it("defaults unknown / non-string input to coexistir", () => {
    expect(toKind("whatever")).toBe("coexistir");
    expect(toKind(null)).toBe("coexistir");
    expect(toKind(42)).toBe("coexistir");
  });
});

describe("classidy toTechItems", () => {
  it("maps string items to coexistir entries", () => {
    expect(toTechItems(["Slack"])).toEqual([{ name: "Slack", kind: "coexistir" }]);
  });

  it("reads object items via the varied Cassidy key names", () => {
    expect(
      toTechItems([
        { "Tool Name": "Workday", "Humand Relationship": "desplazar" },
        { Technology: "SAP" },
        { Name: "Notion", Kind: "integrar" },
        { Tool: "Jira" },
        { name: "Asana", kind: "coexistir" },
      ]),
    ).toEqual([
      { name: "Workday", kind: "desplazar" },
      { name: "SAP", kind: "coexistir" },
      { name: "Notion", kind: "integrar" },
      { name: "Jira", kind: "coexistir" },
      { name: "Asana", kind: "coexistir" },
    ]);
  });

  it("returns [] for null / empty input", () => {
    expect(toTechItems(null)).toEqual([]);
    expect(toTechItems(undefined)).toEqual([]);
    expect(toTechItems([])).toEqual([]);
  });

  it("filters out items whose name is empty/whitespace-only", () => {
    expect(toTechItems([{ "Tool Name": "   " }, { Name: "" }, {}])).toEqual([]);
  });
});

describe("classidy toProv", () => {
  it("maps a full provenance block verbatim", () => {
    const raw: RawProv = {
      Source: "Crunchbase",
      "Source Type": "declarado",
      Confidence: 0.8,
      Status: "validated",
    };
    expect(toProv(raw)).toEqual({
      source: "Crunchbase",
      sourceType: "declarado",
      confidence: 0.8,
      status: "validated",
    });
  });

  it("applies honest defaults when the block is missing", () => {
    expect(toProv(null)).toEqual({
      source: "Cassidy",
      sourceType: "inferido",
      confidence: 0.5,
      status: "inferred",
    });
  });

  it("coerces an unknown status to inferred and keeps known ones", () => {
    expect(toProv({ Status: "weird" }).status).toBe("inferred");
    expect(toProv({ Status: "cold" }).status).toBe("cold");
    expect(toProv({ Status: "validated" }).status).toBe("validated");
  });

  it("clamps confidence into [0,1]", () => {
    expect(toProv({ Confidence: 1.5 }).confidence).toBe(1);
    expect(toProv({ Confidence: -1 }).confidence).toBe(0);
  });
});

describe("classidy normalize", () => {
  const fullRaw: CassidyRaw = {
    "Company Summary": {
      Summary: "An HR software company.",
      "Provenance Metadata": { Status: "validated", Confidence: 0.9 },
    },
    "Region Information": {
      Region: "LATAM",
      "Provenance Metadata": { Status: "inferred" },
    },
    "Workforce Percentage": {
      "Workforce Percentage": 150,
      "Provenance Metadata": { Status: "inferred" },
    },
    "Company Headcount": {
      Headcount: 123.7,
      "Provenance Metadata": { Status: "validated" },
    },
    "Technology Stack": ["Slack"],
    "Key Stakeholders": [
      {
        Name: "Jane Doe",
        Title: "CHRO",
        "Decision Role": "Decision Maker",
        Email: "jane@acme.com",
        "LinkedIn URL": "https://linkedin.com/in/jane",
        "Provenance Metadata": { Status: "validated" },
      },
      {
        Name: "Bob",
        Email: "Not available",
        "LinkedIn URL": "Not available",
        "Provenance Metadata": null,
      },
      // whitespace-only name → filtered out
      { Name: "   ", "Provenance Metadata": null },
    ],
    "Company Pain Points": [
      { "Pain Point": "Manual onboarding", "Provenance Metadata": null },
    ],
  };

  it("rounds + floors headcount and clamps workforce to [0,100]", () => {
    const out = normalize(fullRaw);
    expect(out.headcount?.value).toBe(124);
    expect(out.workforcePercentage?.value).toBe(100);
  });

  it("floors a negative headcount to 0", () => {
    const out = normalize({
      "Company Headcount": { Headcount: -5, "Provenance Metadata": null },
    });
    expect(out.headcount?.value).toBe(0);
  });

  it("nulls the 'Not available' sentinel for email and LinkedIn", () => {
    const out = normalize(fullRaw);
    const bob = out.stakeholders.find((s) => s.name === "Bob");
    expect(bob?.email).toBeNull();
    expect(bob?.linkedinUrl).toBeNull();
  });

  it("keeps a real email + http(s) LinkedIn url", () => {
    const jane = normalize(fullRaw).stakeholders.find((s) => s.name === "Jane Doe");
    expect(jane?.email).toBe("jane@acme.com");
    expect(jane?.linkedinUrl).toBe("https://linkedin.com/in/jane");
  });

  it("drops stakeholders whose name is whitespace-only", () => {
    const out = normalize(fullRaw);
    expect(out.stakeholders.map((s) => s.name)).toEqual(["Jane Doe", "Bob"]);
  });

  it("falls back to cold provenance + '—' when a section is missing", () => {
    const out = normalize({});
    expect(out.summary.value).toBe("—");
    expect(out.summary.prov.status).toBe("cold");
    expect(out.region.value).toBe("—");
    expect(out.workforcePercentage).toBeNull();
    expect(out.headcount).toBeNull();
    expect(out.stakeholders).toEqual([]);
    expect(out.painPoints).toEqual([]);
  });
});
