import type { Language } from "@/types";
import { useLanguage, useT, type MessageKey } from "@/i18n";

const LANG_NAME_KEY: Record<Language, MessageKey> = {
  es: "i18n.lang.es",
  en: "i18n.lang.en",
};

export interface StaleLanguageNoteProps {
  contentLang: Language;
  className?: string;
}


export function StaleLanguageNote({
  contentLang,
  className = "",
}: StaleLanguageNoteProps) {
  const { lang } = useLanguage();
  const t = useT();
  if (contentLang === lang) return null;
  return (
    <div
      role="note"
      className={`flex items-start gap-1.5 rounded-lg border border-inferred/30 bg-inferred-soft px-2.5 py-1.5 text-[11px] leading-snug text-inferred ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="mt-px h-3 w-3 flex-none"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18" />
      </svg>
      <span>{t("i18n.staleNotice", { lang: t(LANG_NAME_KEY[contentLang]) })}</span>
    </div>
  );
}
