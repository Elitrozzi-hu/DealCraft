import { z } from "zod";

import type { PublishedSuccessCase } from "../../types/index.js";

// Lenient runtime validator for a `PublishedSuccessCase` minus `synced_at` (which
// DealCraft stamps on persist). Unknown keys stripped; missing lists → [], missing
// nullable scalars → null. `content.en` is nullable (null until translated).

const metricSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const localizedContentSchema = z.object({
  industry: z.string(),
  tagline: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  pains: z.array(z.string()).default([]),
  solution_narrative: z.string().nullable().default(null),
  modules: z.array(z.string()).default([]),
  metrics: z.array(metricSchema).default([]),
  quote: z.string().nullable().default(null),
  quote_author_role: z.string().nullable().default(null),
  company_description: z.string().nullable().default(null),
});

export const cassidySuccessCaseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  company: z.string(),
  country: z.array(z.string()).default([]),
  users: z.number().int().nullable().default(null),
  link_web: z.string().nullable().default(null),
  link_youtube: z.string().nullable().default(null),
  link_video: z.null().default(null),
  link_doc: z.string().nullable().default(null),
  quote_author: z.string().nullable().default(null),
  content: z.object({
    es: localizedContentSchema,
    en: localizedContentSchema.nullable().default(null),
  }),
});

export type CassidySuccessCaseRecord = z.infer<typeof cassidySuccessCaseSchema>;

// Compile-time guard: schema output and the TS type (minus synced_at) must not drift.
type _Parity = Omit<PublishedSuccessCase, "synced_at"> extends CassidySuccessCaseRecord
  ? true
  : never;
const _parityGuard: _Parity = true;

export function validateCassidyRecord(
  raw: unknown,
): Omit<PublishedSuccessCase, "synced_at"> {
  void _parityGuard;
  return cassidySuccessCaseSchema.parse(raw);
}
