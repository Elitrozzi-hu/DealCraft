import type { Language } from "@/types";

export function languageDirective(lang: Language): string {
  return lang === "en"
    ? "Write ALL output fields in English. Sources may be in other languages; translate their content into English. Do not mix languages."
    : "Escribí TODOS los campos de salida en español neutral/rioplatense. Las fuentes pueden estar en otros idiomas; traducí su contenido al español. No mezcles idiomas.";
}
