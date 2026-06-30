

import type { Language } from "@/types";

const LOCALE: Record<Language, string> = { es: "es-AR", en: "en-US" };

export function localeFor(lang: Language): string {
  return LOCALE[lang];
}

export function formatNumber(n: number, lang: Language): string {
  return n.toLocaleString(localeFor(lang));
}
