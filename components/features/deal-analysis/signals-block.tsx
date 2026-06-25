"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Chip, SourceLinkIcon, StatusDot } from "@/components/ui";
import { searchSignals } from "@/lib/api-client";
import type { SignalItem, SignalType } from "@/types";

// --- Types ---

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; signals: SignalItem[] };

export interface SignalsBlockProps {
  company: string;
  domain: string;
  onCountChange: (count: number | null) => void;
}

// --- Constants ---

const SCAN_STEPS = [
  "Buscando cambios de liderazgo…",
  "Buscando M&A y financiamiento…",
  "Buscando expansiones y nuevas aperturas…",
  "Buscando programas de cultura y GPTW…",
  "Buscando reestructuraciones y conflictos…",
  "Verificando stack tecnológico…",
];

const TYPE_LABELS: Record<SignalType, string> = {
  new_people_leader: "Nuevo líder RRHH",
  m_and_a: "M&A",
  funding: "Financiamiento",
  hiring_surge: "Contratación masiva",
  expansion: "Expansión",
  hr_digital_transformation: "Transf. HR Digital",
  culture_program: "Cultura",
  gptw: "GPTW",
  restructuring: "Reestructuración",
  labor_conflict: "Conflicto laboral",
  esg_dei: "ESG / DEI",
  compliance_training: "Compliance",
  turnover: "Rotación",
  stack: "Stack tecnológico",
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

function formatDate(d: string): string {
  const iso = d.match(/^(\d{4})-(\d{2})(-\d{2})?$/);
  if (!iso) return d;
  try {
    const date = new Date(`${iso[1]}-${iso[2]}-01`);
    return date.toLocaleDateString("es-AR", { month: "short", year: "numeric" });
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
  // A source_url is proof the fact is backed by a real source — show as
  // verified regardless of the LLM's inferred/verified distinction, which
  // reflects how it was derived rather than whether a source exists.
  const statusDotStatus = signal.source_url ? "validated" : "inferred";

  return (
    <div className={`rounded-xl p-3 ${TIER_CARD[signal.tier]}`}>
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <Chip tone={TIER_CHIP_TONE[signal.tier]}>{TYPE_LABELS[signal.type]}</Chip>
        {signal.date && (
          <span className="text-[11px] text-cold">{formatDate(signal.date)}</span>
        )}
        <span className={`ml-auto flex items-center gap-1 ${statusDotStatus === "validated" ? "text-validated" : "text-inferred"}`}>
          <StatusDot status={statusDotStatus} size={8} />
          <span className="text-[10px] font-semibold">
            {signal.source_url ? "verificado" : "inferido"}
          </span>
        </span>
      </div>

      <p className="mb-1 text-[13.5px] font-bold leading-snug text-ink">
        {signal.headline}
      </p>
      <p className="mb-2.5 text-[12px] leading-relaxed text-cold">
        {signal.summary}
      </p>

      <a
        href={signal.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet transition-opacity hover:opacity-75"
      >
        {getHostname(signal.source_url)}
        <SourceLinkIcon />
      </a>
    </div>
  );
}

// --- Main component ---

export function SignalsBlock({ company, domain, onCountChange }: SignalsBlockProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [stepIdx, setStepIdx] = useState(0);

  // Cycle scan step labels while loading.
  useEffect(() => {
    if (phase.kind !== "loading") return;
    const id = setInterval(() => {
      setStepIdx((i) => (i + 1) % SCAN_STEPS.length);
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
      const result = await searchSignals({ company, domain });
      setPhase({ kind: "done", signals: result.signals });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setPhase({ kind: "error", message });
    }
  }, [company, domain]);

  // --- Idle ---
  if (phase.kind === "idle") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-cold/30 bg-cold-soft/30 px-5 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-panel text-cold shadow-sm">
          <RadarIcon />
        </div>
        <div>
          <p className="text-[13.5px] font-bold text-ink">Signals de mercado</p>
          <p className="mt-1 max-w-[34ch] text-[11.5px] leading-relaxed text-cold">
            Detectá qué está pasando en la empresa ahora — cambios de
            liderazgo, financiamiento, expansiones y más.
          </p>
        </div>
        <Button primary onClick={handleResearch}>
          Investigar signals
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
          <p className="text-[13.5px] font-bold text-ink">Investigando…</p>
          <p className="mt-1 text-[11.5px] text-cold transition-all">
            {SCAN_STEPS[stepIdx]}
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
          <p className="text-[13px] font-bold text-ink">La investigación falló</p>
          <p className="mt-1 max-w-[36ch] text-[11.5px] leading-relaxed text-cold">
            {phase.message}
          </p>
        </div>
        <Button onClick={handleResearch}>Reintentar</Button>
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
            Sin signals en los últimos 6 meses
          </p>
          <p className="mt-1 max-w-[36ch] text-[11.5px] leading-relaxed text-cold">
            No encontramos eventos recientes y verificables para esta empresa.
            Puede haber más información disponible en otros idiomas o fuentes.
          </p>
        </div>
        <Button onClick={handleResearch}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11.5px] text-cold">
          Últimos 6 meses · investigación en tiempo real
        </span>
        <span className="rounded-md border border-cold/20 bg-cold-soft px-2 py-px text-[10px] font-semibold text-cold">
          llm-websearch
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {sorted.map((signal, i) => (
          <SignalCard key={`${signal.type}-${i}`} signal={signal} />
        ))}
      </div>
      <button
        type="button"
        onClick={handleResearch}
        className="mt-3 text-[11px] font-semibold text-cold transition-colors hover:text-violet"
      >
        Reinvestigar →
      </button>
    </div>
  );
}
