import "server-only";

import fs from "fs";
import path from "path";

import type { PublishedSuccessCase } from "@/types";

let cached: PublishedSuccessCase[] | null = null;

function loadAll(): PublishedSuccessCase[] {
  if (cached) return cached;
  const filePath = path.join(process.cwd(), "data", "success-cases.json");
  const raw = fs.readFileSync(filePath, "utf-8");
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
    const en = c.industry_en.toLowerCase();
    return es.includes(b) || b.includes(es) || en.includes(b) || b.includes(en);
  });
}
