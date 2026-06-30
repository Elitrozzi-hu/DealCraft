import type { Language } from "@/types";
import { LANGUAGES } from "@/lib/constants";
import { useLanguage } from "@/i18n";

const FACE: Record<Language, string> = { es: "ES", en: "EN" };
const NAME: Record<Language, string> = { es: "Español", en: "English" };


export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Idioma / Language"
      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[15px] w-[15px] flex-none text-cold"
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

      <div className="relative isolate inline-flex">
        <span
          aria-hidden
          className={`absolute inset-y-0 left-0 z-0 w-1/2 rounded-full bg-violet shadow-[0_1px_2px_rgba(31,73,229,0.35)] transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            lang === "en" ? "translate-x-full" : "translate-x-0"
          }`}
        />
        {LANGUAGES.map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={lang === code}
            title={NAME[code]}
            onClick={() => setLang(code)}
            className={`relative z-[1] min-w-[38px] rounded-full px-3 py-1 text-center text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet/50 ${
              lang === code ? "text-white" : "text-cold"
            }`}
          >
            {FACE[code]}
          </button>
        ))}
      </div>
    </div>
  );
}
