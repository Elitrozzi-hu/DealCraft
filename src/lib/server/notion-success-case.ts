import type { PublishedSuccessCase } from "@/types";
import { validateCassidyRecord } from "@/lib/server/success-case-schema";

// Notion → success-case mapping for the metadata-only path (no `link_web`). Plain
// field-mapping, defensive against missing/null. Mirrors STEP 1/2/4 of the Cassidy
// system prompt so both sync paths produce the same shape.

function asObject(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asArray(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function getUrl(prop: unknown): string | null {
  return asString(asObject(prop)?.url);
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isHost(url: string, base: string): boolean {
  const h = hostnameOf(url);
  return !!h && (h === base || h.endsWith(`.${base}`));
}

export interface ParsedNotionProperties {
  company: string;
  industry: string;
  link_doc: string | null;
  link_youtube: string | null;
  link_web: string | null;
  country: string[];
  users: number | null;
}

export function parseNotionProperties(props: unknown): ParsedNotionProperties {
  const p = asObject(props) ?? {};

  const titleBlock = asArray(asObject(p["Cliente"])?.title)?.[0];
  const rawCompany = asString(asObject(titleBlock)?.plain_text) ?? "";
  const company = rawCompany.trim().replace(/\s*\(\d+\)\s*$/, "").trim();

  const industry = asString(asObject(asObject(p["Industria"])?.select)?.name) ?? "";

  const rawDoc = getUrl(p["Link Doc"]);
  const link_doc = rawDoc && !isHost(rawDoc, "canva.com") ? rawDoc : null;

  const rawVideo = getUrl(p["Link Video"]);
  const link_youtube =
    rawVideo && (isHost(rawVideo, "youtube.com") || isHost(rawVideo, "youtu.be"))
      ? rawVideo
      : null;

  const link_web = getUrl(p["Link web"]);

  const country = (asArray(asObject(p["País"])?.multi_select) ?? [])
    .map((m) => asString(asObject(m)?.name))
    .filter((n): n is string => n !== null);

  const usersText = asString(asObject(asArray(asObject(p["Users"])?.rich_text)?.[0])?.plain_text);
  const digits = usersText?.replace(/\D/g, "") ?? "";
  const users = digits.length > 0 ? parseInt(digits, 10) : null;

  return { company, industry, link_doc, link_youtube, link_web, country, users };
}

/** Last non-empty path segment of `linkWeb` (e.g. `…/farmashop-es/` →
 *  `farmashop-es`); fallback: slugified company. */
export function deriveSlug(company: string, linkWeb: string | null): string {
  if (linkWeb) {
    let pathname = linkWeb;
    try {
      pathname = new URL(linkWeb).pathname;
    } catch {
      // not an absolute URL — split the raw string
    }
    const segments = pathname.split("/").filter((s) => s.length > 0);
    const last = segments[segments.length - 1];
    if (last) return last;
  }
  return company
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Assemble the metadata-only record (`industry_en: null`, narrative fields null,
 *  lists empty), validated through the shared gate. */
export function buildMetadataOnlyRecord(
  props: unknown,
): Omit<PublishedSuccessCase, "synced_at"> {
  const parsed = parseNotionProperties(props);
  const slug = deriveSlug(parsed.company, parsed.link_web);
  return validateCassidyRecord({
    id: slug,
    slug,
    company: parsed.company,
    country: parsed.country,
    industry: parsed.industry,
    industry_en: null,
    users: parsed.users,
    link_web: parsed.link_web,
    link_youtube: parsed.link_youtube,
    link_video: null,
    link_doc: parsed.link_doc,
    tagline: null,
    description: null,
    pains: [],
    solution_narrative: null,
    modules: [],
    metrics: [],
    quote: null,
    quote_author: null,
    quote_author_role: null,
    company_description: null,
  });
}
