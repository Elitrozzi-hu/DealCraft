import { useState } from "react";
import type { PublishedSuccessCase } from "@/types";
import { formatNumber, useLanguage, useT } from "@/i18n";

export interface CompsBlockProps {
  successCases: PublishedSuccessCase[];
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden
      className={`shrink-0 text-cold/60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M1.5 8.5 8.5 1.5M4 1.5h4.5v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
      <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
    </svg>
  );
}

/** One-line summary shown while the card is collapsed so the AE can decide whether to open it. */
function CollapsedPreview({ c }: { c: PublishedSuccessCase }) {
  const t = useT();
  const hasAnything = c.metrics.length > 0 || c.pains.length > 0 || c.modules.length > 0;
  if (!hasAnything) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {c.metrics.map((m) => (
        <span
          key={`${m.label}-${m.value}`}
          className="rounded border border-validated/20 bg-validated-soft/60 px-1.5 py-px text-[9.5px] font-bold text-validated"
        >
          {m.value}
        </span>
      ))}
      {c.pains.length > 0 && (
        <span className="text-[9.5px] text-cold/70">
          {c.metrics.length > 0 && "·"}{" "}
          {c.pains.length === 1
            ? t("comps.painsOne", { count: c.pains.length })
            : t("comps.painsMany", { count: c.pains.length })}
        </span>
      )}
      {c.modules.length > 0 && (
        <span className="text-[9.5px] text-cold/70">
          ·{" "}
          {c.modules.length === 1
            ? t("comps.modulesOne", { count: c.modules.length })
            : t("comps.modulesMany", { count: c.modules.length })}
        </span>
      )}
    </div>
  );
}

function CaseCard({ c }: { c: PublishedSuccessCase }) {
  const t = useT();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const hasMetrics = c.metrics.length > 0;
  const hasPains = c.pains.length > 0;
  const hasModules = c.modules.length > 0;
  const hasLinks = c.link_web || c.link_youtube;
  const hasBody = hasMetrics || hasPains || hasModules;

  return (
    <div className="rounded-xl border border-line bg-panel shadow-sm overflow-hidden">

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface/50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-[13px] font-bold leading-tight text-ink">{c.company}</p>
            {c.users != null && (
              <span className="text-[10px] tabular-nums text-cold/80">
                {t("comps.collaborators", {
                  count: formatNumber(c.users, lang),
                })}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-cold/80">
            {[c.industry, c.country.join(", ")].filter(Boolean).join(" · ")}
          </p>
          {!open && <CollapsedPreview c={c} />}
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && hasBody && (
        <div className="border-t border-line/50 px-3 py-3 space-y-3">

          {hasPains && (
            <div>
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-cold/70">
                {t("panel.tab.pains")}
              </p>
              <ul className="space-y-1">
                {c.pains.map((p) => (
                  <li key={p} className="flex gap-2 text-[11px] leading-snug text-ink/70">
                    <span className="mt-px shrink-0 font-medium text-cold/50">–</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasModules && (
            <div className="rounded-lg bg-surface/60 px-2.5 py-2">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-cold/70">
                {t("comps.modulesImplemented")}
              </p>
              <div className="flex flex-wrap gap-1">
                {c.modules.map((m) => (
                  <span
                    key={m}
                    className="rounded-md border border-violet/20 bg-panel px-2 py-0.5 text-[10px] font-medium text-violet"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasMetrics && (
            <div className="border-t border-line/50 pt-2.5">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-cold/70">
                {t("comps.afterImplementing")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {c.metrics.map((m) => (
                  <div key={`${m.label}-${m.value}`} className="rounded-lg border border-validated/15 bg-validated-soft/40 px-2.5 py-1.5 max-w-[8rem]">
                    <p className="text-[13px] font-bold tabular-nums leading-none text-validated">
                      {m.value}
                    </p>
                    <p className="mt-0.5 text-[9px] leading-snug text-cold/80">
                      {m.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasMetrics && !hasPains && !hasModules && c.tagline && (
            <p className="text-[11px] italic leading-relaxed text-cold">
              &ldquo;{c.tagline}&rdquo;
            </p>
          )}
        </div>
      )}

      {open && hasLinks && (
        <div className="flex flex-wrap gap-1.5 border-t border-line/50 px-3 py-2">
          {c.link_web && (
            <a
              href={c.link_web}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet/25 bg-violet-soft px-3 py-1 text-[10.5px] font-semibold text-violet transition-colors hover:bg-violet/10"
            >
              {t("comps.viewCase")}
              <ExternalIcon />
            </a>
          )}
          {c.link_youtube && (
            <a
              href={c.link_youtube}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1 text-[10.5px] font-semibold text-cold transition-colors hover:bg-cold-soft"
            >
              <PlayIcon />
              {t("comps.viewVideo")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function CompsBlock({ successCases }: CompsBlockProps) {
  const t = useT();
  if (successCases.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-cold/20 bg-cold-soft/20 px-5 py-6 text-center">
        <p className="text-[12.5px] font-semibold text-ink">
          {t("comps.emptyTitle")}
        </p>
        <p className="max-w-[32ch] text-[11px] leading-relaxed text-cold">
          {t("comps.emptyBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {successCases.map((c) => (
        <CaseCard key={c.id} c={c} />
      ))}
    </div>
  );
}
