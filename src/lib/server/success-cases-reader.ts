import fs from "fs";
import path from "path";

import type { PublishedSuccessCase } from "../../types/index.js";

const FILE_PATH = path.join(process.cwd(), "data", "success-cases.json");

let cached: PublishedSuccessCase[] | null = null;

function loadAll(): PublishedSuccessCase[] {
  if (cached) return cached;
  const raw = fs.readFileSync(FILE_PATH, "utf-8");
  cached = JSON.parse(raw) as PublishedSuccessCase[];
  return cached;
}

export function getSuccessCasesByIndustry(
  industry: string | null,
): PublishedSuccessCase[] {
  if (!industry || industry.trim() === "") return [];
  const b = industry.toLowerCase();
  return loadAll().filter((c) => {
    const es = c.industry.toLowerCase();
    // Skip the English check when industry_en is null — don't collapse to "" (a
    // `b.includes("")` would match every query).
    const en = c.industry_en?.toLowerCase();
    return (
      es.includes(b) ||
      b.includes(es) ||
      (en ? en.includes(b) || b.includes(en) : false)
    );
  });
}

/** Upsert by `slug` into the local JSON store. Reads fresh from disk (not the
 *  cached `loadAll()`), replaces or appends, writes 2-space JSON. Leaves the module
 *  cache untouched (dev-only staleness). Interim store — see the persistence TODO. */
export function upsertSuccessCase(record: PublishedSuccessCase): void {
  const raw = fs.readFileSync(FILE_PATH, "utf-8");
  const all = JSON.parse(raw) as PublishedSuccessCase[];
  const idx = all.findIndex((c) => c.slug === record.slug);
  if (idx >= 0) {
    all[idx] = record;
  } else {
    all.push(record);
  }
  fs.writeFileSync(FILE_PATH, JSON.stringify(all, null, 2) + "\n", "utf-8");
}
