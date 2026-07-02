import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildGladosExtractRequestBody } from "@/lib/llm/providers/glados";

const schema = z.object({ name: z.string() });
const jsonSchema = z.toJSONSchema(schema);

describe("buildGladosExtractRequestBody", () => {
  it("builds instructions/content/schema/model_size/attribution from system + prompt", () => {
    const body = buildGladosExtractRequestBody(
      {
        system: "You are a helpful assistant.",
        prompt: "Extract the name.",
        tier: "tiny",
        attributionTag: "pre-call-brief:generate",
      },
      jsonSchema,
    );

    expect(body.instructions).toBe("You are a helpful assistant.");
    expect(body.content).toEqual([{ type: "text", text: "Extract the name." }]);
    expect(body.schema).toMatchObject({ properties: { name: { type: "string" } } });
    expect(body.model_size).toBe("tiny");
    expect(body.attribution).toEqual({ tag: "pre-call-brief:generate" });

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("Respond with ONLY valid JSON");
    expect(serialized).not.toContain("response_format");
    expect(serialized).not.toContain("json_schema");
    expect(serialized).not.toContain("strict");
  });

  it("omits the attribution key entirely when no attributionTag is given", () => {
    const body = buildGladosExtractRequestBody(
      { system: "System.", prompt: "Prompt." },
      jsonSchema,
    );

    expect(body).not.toHaveProperty("attribution");
  });

  it("falls back to flattened message text when system/prompt are both unset", () => {
    const body = buildGladosExtractRequestBody(
      {
        messages: [
          { role: "user", content: "First part." },
          { role: "assistant", content: "Second part." },
        ],
      },
      jsonSchema,
    );

    expect(body.instructions).toBe("");
    expect(body.content).toEqual([{ type: "text", text: "First part.\n\nSecond part." }]);
  });
});
