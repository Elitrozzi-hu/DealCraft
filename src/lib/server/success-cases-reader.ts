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
    const es = c.content.es.industry.toLowerCase();
    const en = c.content.en?.industry.toLowerCase();
    return (
      es.includes(b) ||
      b.includes(es) ||
      (en ? en.includes(b) || b.includes(en) : false)
    );
  });
}


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
