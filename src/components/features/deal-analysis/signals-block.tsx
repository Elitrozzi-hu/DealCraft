import { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Chip, LinkAnchor, LinkButton, SourceLinkIcon, StaleLanguageNote, StatusDot } from "@/components/ui";
import { searchSignals } from "@/lib/api-client";
import type { Language, SignalItem, SignalType } from "@/types";
import { localeFor, useLanguage, useT, type MessageKey } from "@/i18n";

// --- Types ---

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; signals: SignalItem[]; lang: Language };

export interface SignalsBlockProps {
  company: string;
  domain: string;
  hubspotDealId: string | null;
  onCountChange: (count: number | null) => void;
}

// --- Constants ---

// Number of scan-step labels cycled while loading (labels resolved via t()).
const SCAN_STEP_COUNT = 6;

const TYPE_LABEL_KEY: Record<SignalType, MessageKey> = {
  new_people_leader: "signals.type.new_people_leader",
  m_and_a: "signals.type.m_and_a",
  funding: "signals.type.funding",
  hiring_surge: "signals.type.hiring_surge",
  expansion: "signals.type.expansion",
  hr_digital_transformation: "signals.type.hr_digital_transformation",
  culture_program: "signals.type.culture_program",
  gptw: "signals.type.gptw",
  restructuring: "signals.type.restructuring",
  labor_conflict: "signals.type.labor_conflict",
  esg_dei: "signals.type.esg_dei",
  compliance_training: "signals.type.compliance_training",
  turnover: "signals.type.turnover",
  stack: "signals.type.stack",
};

const TIER_CHIP_TONE: Record<1 | 2 | 3, "violet" | "inferred" | "cold"> = {
  1: "violet",
  2: "inferred",
  3: "cold",
};

const TIER_CARD: Record<1 | 2 | 3, string> = {
  1: "border border-violet/20 border-l-[3px] border-l-violet bg-violet-soft/40",
  2: "border border-line",
  3: "border border-line/60",
};


// --- Helpers ---

function formatDate(d: string, lang: Language): string {
  const iso = d.match(/^(\d{4})-(\d{2})(-\d{2})?$/);
  if (!iso) return d;
  try {
    const date = new Date(`${iso[1]}-${iso[2]}-01`);
    return date.toLocaleDateString(localeFor(lang), {
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 40);
  }
}

// --- Sub-components ---

function RadarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <line x1="12" y1="3" x2="12" y2="6.5" />
      <line x1="12" y1="17.5" x2="12" y2="21" />
      <line x1="3" y1="12" x2="6.5" y2="12" />
      <line x1="17.5" y1="12" x2="21" y2="12" />
    </svg>
  );
}

function SignalCard({ signal }: { signal: SignalItem }) {
  const t = useT();
  const { lang } = useLanguage();
  const statusDotStatus = signal.source_url ? "validated" : "inferred";

  return (
    <div className={`rounded-xl p-3 ${TIER_CARD[signal.tier]}`}>
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <Chip tone={TIER_CHIP_TONE[signal.tier]}>{t(TYPE_LABEL_KEY[signal.type])}</Chip>
        {signal.date && (
          <span className="text-[11px] text-cold">{formatDate(signal.date, lang)}</span>
        )}
        <span className={`ml-auto flex items-center gap-1 ${statusDotStatus === "validated" ? "text-validated" : "text-inferred"}`}>
          <StatusDot status={statusDotStatus} size={8} />
          <span className="text-[10px] font-semibold">
            {signal.source_url ? t("signals.verified") : t("ui.status.inferred.word")}
          </span>
        </span>
      </div>

      <p className="mb-1 text-[13.5px] font-bold leading-snug text-ink">
        {signal.headline}
      </p>
      <p className="mb-2.5 text-[12px] leading-relaxed text-cold">
        {signal.summary}
      </p>

      <LinkAnchor href={signal.source_url} target="_blank" rel="noopener noreferrer" tone="cold">
        {getHostname(signal.source_url)}
        <SourceLinkIcon className="shrink-0" />
      </LinkAnchor>
    </div>
  );
}

// --- Main component ---

export function SignalsBlock({ company, domain, hubspotDealId, onCountChange }: SignalsBlockProps) {
  const t = useT();
  const { lang } = useLanguage();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [stepIdx, setStepIdx] = useState(0);
  const scanSteps = useMemo(() => [
    t("signals.scan.leadership"),
    t("signals.scan.maFunding"),
    t("signals.scan.expansion"),
    t("signals.scan.culture"),
    t("signals.scan.restructuring"),
    t("signals.scan.stack"),
  ], [t]);

  // Cycle scan step labels while loading.
  useEffect(() => {
    if (phase.kind !== "loading") return;
    const id = setInterval(() => {
      setStepIdx((i) => (i + 1) % SCAN_STEP_COUNT);
    }, 3000);
    return () => clearInterval(id);
  }, [phase.kind]);

  // Notify parent of signal count whenever phase changes.
  useEffect(() => {
    if (phase.kind === "done") {
      onCountChange(phase.signals.length);
    } else if (phase.kind === "idle" || phase.kind === "error") {
      onCountChange(null);
    }
  }, [phase, onCountChange]);

  const handleResearch = useCallback(async () => {
    setPhase({ kind: "loading" });
    setStepIdx(0);
    try {
      const result = await searchSignals({ company, domain, hubspotDealId, language: lang });
      setPhase({ kind: "done", signals: result.signals, lang });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.unknownError");
      setPhase({ kind: "error", message });
    }
  }, [company, domain, hubspotDealId, lang, t]);

  // --- Idle ---
  if (phase.kind === "idle") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-cold/30 bg-cold-soft/30 px-5 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-panel text-cold shadow-sm">
          <RadarIcon />
        </div>
        <div>
          <p className="text-[13.5px] font-bold text-ink">{t("signals.idleTitle")}</p>
          <p className="mt-1 max-w-[34ch] text-[11.5px] leading-relaxed text-cold">
            {t("signals.idleBody")}
          </p>
        </div>
        <Button primary onClick={handleResearch}>
          {t("signals.research")}
        </Button>
      </div>
    );
  }

  // --- Loading ---
  if (phase.kind === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-violet/15 bg-violet-soft/20 px-5 py-8 text-center">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-violet/40 animate-ping" />
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-violet/20 bg-panel text-violet">
            <RadarIcon />
          </div>
        </div>
        <div>
          <p className="text-[13.5px] font-bold text-ink">{t("signals.researching")}</p>
          <p className="mt-1 text-[11.5px] text-cold transition-all">
            {scanSteps[stepIdx]}
          </p>
        </div>
      </div>
    );
  }

  // --- Error ---
  if (phase.kind === "error") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-risk/25 bg-risk-soft px-5 py-7 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-risk/20 bg-panel text-risk text-[15px] font-bold">
          ✕
        </div>
        <div>
          <p className="text-[13px] font-bold text-ink">{t("signals.errorTitle")}</p>
          <p className="mt-1 max-w-[36ch] text-[11.5px] leading-relaxed text-cold">
            {phase.message}
          </p>
        </div>
        <Button onClick={handleResearch}>{t("common.retry")}</Button>
      </div>
    );
  }

  // --- Done ---
  const sorted = [...phase.signals].sort((a, b) => a.tier - b.tier);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-cold/30 bg-cold-soft/30 px-5 py-7 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-panel text-cold">
          <RadarIcon />
        </div>
        <div>
          <p className="text-[13px] font-bold text-ink">
            {t("signals.emptyTitle")}
          </p>
          <p className="mt-1 max-w-[36ch] text-[11.5px] leading-relaxed text-cold">
            {t("signals.emptyBody")}
          </p>
        </div>
        <Button onClick={handleResearch}>{t("common.retry")}</Button>
      </div>
    );
  }

  return (
    <div>
      <StaleLanguageNote contentLang={phase.lang} className="mb-2" />
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11.5px] text-cold">{t("signals.realtime")}</span>
        <span className="rounded-md border border-cold/20 bg-cold-soft px-2 py-px text-[10px] font-semibold text-cold">
          llm-websearch
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {sorted.map((signal) => (
          <SignalCard key={`${signal.type}-${signal.headline}`} signal={signal} />
        ))}
      </div>
      <div className="mt-3">
        <LinkButton tone="cold" onClick={handleResearch}>
          {t("signals.reResearch")}
        </LinkButton>
      </div>
    </div>
  );
}
