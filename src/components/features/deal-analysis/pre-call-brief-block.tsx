import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  LinkAnchor,
  LinkButton,
  SourceLinkIcon,
  StaleLanguageNote,
  StatusDot,
} from "@/components/ui";
import { generatePreCallBrief } from "@/lib/api-client";
import type {
  Language,
  PreCallBrief,
  PreCallBriefRequest,
  PreCallHypothesis,
} from "@/types";
import { useLanguage, useT } from "@/i18n";

// --- Types ---

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; brief: PreCallBrief; lang: Language };

export interface PreCallBriefBlockProps {
  request: PreCallBriefRequest;
  onCountChange: (count: number | null) => void;
}

// --- Constants ---

// Number of build-step labels cycled while loading (labels resolved via t()).
const BUILD_STEP_COUNT = 4;

// --- Sub-components ---

function BriefIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M8 11h8M8 15h5" />
    </svg>
  );
}

function getHostname(url: string, fallback: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return fallback;
  }
}

function HypothesisCard({
  h,
  rank,
}: {
  h: PreCallHypothesis;
  rank: number;
}) {
  const t = useT();
  const hasProof = h.proofMetric !== null;

  return (
    <div className="rounded-xl border border-line bg-panel p-3.5 shadow-sm">
      <div className="mb-2 flex items-start gap-2.5">
        <span className="mt-px grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-md bg-violet-soft text-[12px] font-extrabold text-violet">
          {rank}
        </span>
        <p className="m-0 flex-1 text-[13.5px] font-bold leading-snug text-ink">
          {h.title}
        </p>
        {h.suggestedModule && (
          <Chip tone="cold">{h.suggestedModule}</Chip>
        )}
      </div>

      <p className="mb-3 pl-[32px] text-[12.5px] leading-relaxed text-cold">
        {h.rationale}
        <span className="ml-1.5 inline-flex items-center gap-1 align-middle text-[10.5px] font-semibold text-inferred">
          <StatusDot status="inferred" size={8} />
          {t("ui.status.inferred.word")}
        </span>
      </p>

      {/* Proof — only when a comparable case backs the hypothesis */}
      {hasProof && (
        <div className="mb-3 pl-[32px]">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-cold">
            {t("brief.proof")}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-validated/20 bg-validated-soft px-2.5 py-2">
            <span className="flex-1 text-[12px] font-semibold leading-snug text-validated">
              {h.proofCaseCompany ? `${h.proofCaseCompany} — ` : ""}
              {h.proofMetric}
            </span>
            {h.proofSourceUrl && (
              <LinkAnchor
                href={h.proofSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                tone="cold"
              >
                {getHostname(h.proofSourceUrl, t("brief.caseFallback"))}
                <SourceLinkIcon className="shrink-0" />
              </LinkAnchor>
            )}
          </div>
        </div>
      )}

      {h.discoveryQuestions.length > 0 && (
        <div className="mb-3 pl-[32px]">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-cold">
            {t("brief.askToConfirm")}
          </div>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {h.discoveryQuestions.map((q, i) => (
              <li
                key={i}
                className="relative pl-3.5 text-[12.5px] leading-snug text-ink before:absolute before:left-0 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-cold/50"
              >
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-1.5 pl-[32px] sm:flex-row sm:gap-4">
        <p className="m-0 flex-1 text-[12px] leading-snug">
          <span className="font-bold text-validated">✓ {t("brief.confirmsLabel")} · </span>
          <span className="text-cold">{h.confirms}</span>
        </p>
        <p className="m-0 flex-1 text-[12px] leading-snug">
          <span className="font-bold text-risk">✕ {t("brief.discardsLabel")} · </span>
          <span className="text-cold">{h.discards}</span>
        </p>
      </div>
    </div>
  );
}

// --- Main component ---

export function PreCallBriefBlock({
  request,
  onCountChange,
}: PreCallBriefBlockProps) {
  const t = useT();
  const { lang } = useLanguage();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [stepIdx, setStepIdx] = useState(0);
  const buildSteps = useMemo(() => [
    t("brief.build.profile"),
    t("brief.build.comparables"),
    t("brief.build.hypotheses"),
    t("brief.build.questions"),
  ], [t]);

  // Cycle build-step labels while loading.
  useEffect(() => {
    if (phase.kind !== "loading") return;
    const id = setInterval(() => {
      setStepIdx((i) => (i + 1) % BUILD_STEP_COUNT);
    }, 2500);
    return () => clearInterval(id);
  }, [phase.kind]);

  // Notify parent of hypothesis count whenever phase changes.
  useEffect(() => {
    if (phase.kind === "done") {
      onCountChange(phase.brief.hypotheses.length);
    } else if (phase.kind === "idle" || phase.kind === "error") {
      onCountChange(null);
    }
  }, [phase, onCountChange]);

  const handleBuild = useCallback(async () => {
    setPhase({ kind: "loading" });
    setStepIdx(0);
    try {
      const briefLang = request.language ?? lang;
      const brief = await generatePreCallBrief({
        ...request,
        language: briefLang,
      });
      setPhase({ kind: "done", brief, lang: briefLang });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.unknownError");
      setPhase({ kind: "error", message });
    }
  }, [request, lang, t]);

  // --- Idle ---
  if (phase.kind === "idle") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-cold/30 bg-cold-soft/30 px-5 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-panel text-cold shadow-sm">
          <BriefIcon />
        </div>
        <div>
          <p className="text-[13.5px] font-bold text-ink">{t("panel.tab.brief")}</p>
          <p className="mt-1 max-w-[36ch] text-[11.5px] leading-relaxed text-cold">
            {t("brief.idleBody")}
          </p>
        </div>
        <Button primary onClick={handleBuild}>
          {t("brief.buildAction")}
        </Button>
      </div>
    );
  }

  // --- Loading ---
  if (phase.kind === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-violet/15 bg-violet-soft/20 px-5 py-8 text-center">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full border border-violet/40" />
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-violet/20 bg-panel text-violet">
            <BriefIcon />
          </div>
        </div>
        <div>
          <p className="text-[13.5px] font-bold text-ink">{t("brief.building")}</p>
          <p className="mt-1 text-[11.5px] text-cold transition-all">
            {buildSteps[stepIdx]}
          </p>
        </div>
      </div>
    );
  }

  // --- Error ---
  if (phase.kind === "error") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-risk/25 bg-risk-soft px-5 py-7 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-risk/20 bg-panel text-[15px] font-bold text-risk">
          ✕
        </div>
        <div>
          <p className="text-[13px] font-bold text-ink">{t("brief.errorTitle")}</p>
          <p className="mt-1 max-w-[36ch] text-[11.5px] leading-relaxed text-cold">
            {phase.message}
          </p>
        </div>
        <Button onClick={handleBuild}>{t("common.retry")}</Button>
      </div>
    );
  }

  // --- Done ---
  const { hypotheses, contextQuestions } = phase.brief;

  return (
    <div>
      <StaleLanguageNote contentLang={phase.lang} className="mb-3" />
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-cold">
          {t("brief.prioritized", { count: hypotheses.length })}
        </span>
        <span className="rounded-full border border-cold/20 bg-cold-soft px-2 py-px text-[10px] font-semibold text-cold">
          {t("brief.internalUse")}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {hypotheses.map((h, i) => (
          <HypothesisCard key={i} h={h} rank={i + 1} />
        ))}
      </div>

      {contextQuestions.length > 0 && (
        <div className="mt-4 rounded-xl border border-line bg-panel p-3.5 shadow-sm">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-cold">
            {t("brief.contextToCover")}
          </div>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {contextQuestions.map((q, i) => (
              <li
                key={i}
                className="relative pl-3.5 text-[12.5px] leading-snug text-ink before:absolute before:left-0 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-cold/50"
              >
                {q}
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-dashed border-line pt-2.5 text-[11px] leading-relaxed text-cold">
            {t("brief.footer")}
          </p>
        </div>
      )}

      <div className="mt-3">
        <LinkButton tone="cold" onClick={handleBuild}>
          {t("brief.rebuild")}
        </LinkButton>
      </div>
    </div>
  );
}
