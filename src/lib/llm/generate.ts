import { z } from "zod";

import { getGenerationProvider } from "./registry.js";
import { LLM_PROVIDER } from "../server/env.js";
import type { CommonOptions } from "./types.js";

export type { CommonOptions, GenerationResponse, GenerationUsage } from "./types.js";

export async function generate(
  opts: CommonOptions & { schema?: undefined },
): Promise<string>;
export async function generate<T extends z.ZodType>(
  opts: CommonOptions & { schema: T },
): Promise<z.infer<T>>;
export async function generate<T extends z.ZodType>(
  opts: CommonOptions & { schema?: T },
): Promise<string | z.infer<T>> {
  if (opts.schema && opts.tools) {
    throw new Error(
      "generate(): `schema` and `tools` cannot be combined in one call — " +
        "run the tools (e.g. web search) call first, then a separate structured call.",
    );
  }

  const resolvedProvider = opts.provider ?? LLM_PROVIDER ?? "openrouter";
  const result = await getGenerationProvider(resolvedProvider).generate(opts);
  return result as string | z.infer<T>;
}
