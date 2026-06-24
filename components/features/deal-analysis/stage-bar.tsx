"use client";

import { useState } from "react";
import type { Pain, Score, StageKey, Stakeholder } from "@/types";
import { STAGES, stageIndex, stageObj } from "@/lib/constants";
import { Button } from "@/components/ui";

export interface StageBarProps {
  stage: StageKey;
  stakeholders: Stakeholder[];
  pains: Pain[];
  scores: Score;
  mrrConfirmed: boolean;
  onMove: () => void;
  onSelectStage: (stage: StageKey) => void;
}

type PlanItem = [string, boolean];
interface StagePlan {
  goal: string;
  items: PlanItem[];
}

function StageTooltip({ goal, items }: StagePlan) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Objetivo de la etapa"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-4 w-4 place-items-center rounded-full border border-cold/40 bg-panel text-[10px] font-extrabold leading-none text-cold"
      >
        ?
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[60] w-[280px] cursor-default rounded-xl border border-line bg-panel p-3 text-left shadow-[0_8px_26px_rgba(28,24,48,0.16)]">
          <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-violet">
            Objetivo de la etapa
          </div>
          <div className="mt-0.5 text-[13px] font-bold">{goal}</div>
          <div className="mb-1.5 mt-2.5 text-[10.5px] font-bold uppercase tracking-wide text-cold">
            Criterios de salida
          </div>
          <div className="grid gap-1.5">
            {items.map(([t]) => (
              <div key={t} className="flex items-baseline gap-2 text-xs">
                <span className="text-[13px] leading-none text-violet">•</span>
                <span className="text-ink">{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}

export function StageBar({
  stage,
  stakeholders,
  pains,
  scores,
  mrrConfirmed,
  onMove,
  onSelectStage,
}: StageBarProps) {
  const si = stageIndex(stage);
  const so = stageObj(stage);

  const champValidated =
    stakeholders.some((s) => s.role === "Champion" && s.validated) &&
    scores.rolesUnlocked;
  const dmEngaged =
    stakeholders.some(
      (s) =>
        (s.role === "Decision Maker" || s.role === "Economic Buyer") &&
        s.validated,
    ) && scores.rolesUnlocked;
  const domPain = pains.find((p) => p.id === scores.dominantId);
  const domValidated = Boolean(domPain?.validated) && scores.painsUnlocked;

  const plans: Record<StageKey, StagePlan> = {
    lead: {
      goal: "Calificar el fit y conseguir la primera reunión.",
      items: [
        ["Fit de firmografía (deskless alto)", true],
        ["Reunión de discovery agendada", false],
      ],
    },
    discovery: {
      goal: "Validar los dolores e identificar un champion.",
      items: [
        ["Dolor dominante validado", domValidated],
        ["Champion identificado", champValidated],
      ],
    },
    champion: {
      goal: "Conseguir acceso al decisor económico.",
      items: [
        ["Champion validado", champValidated],
        ["Dolor dominante validado", domValidated],
        ["Decisor económico involucrado", dmEngaged],
      ],
    },
    md: {
      goal: "Alinear el ROI y confirmar el MRR.",
      items: [
        ["Decisor involucrado", dmEngaged],
        ["MRR confirmado", mrrConfirmed],
      ],
    },
    procurement: {
      goal: "Confirmar pricing y cerrar.",
      items: [
        ["MRR confirmado", mrrConfirmed],
        ["Propuesta enviada", false],
      ],
    },
  };
  const plan = plans[stage];
  const nextLabel = STAGES[si + 1]?.label ?? "";
  const lastStage = si >= STAGES.length - 1;

  return (
    <div className="sticky top-0 z-20 border-b border-line bg-panel shadow-[0_1px_3px_rgba(28,24,48,0.05)]">
      <div className="mx-auto flex max-w-[1340px] flex-wrap items-center justify-between gap-3.5 px-4 py-3 md:px-[22px]">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-1.5">
            {STAGES.map((s, i) => (
              <button
                key={s.key}
                type="button"
                title={s.label}
                aria-label={s.label}
                onClick={() => onSelectStage(s.key)}
                className={`h-[11px] rounded-full transition-all ${i === si ? "w-[26px]" : "w-[11px]"} ${i < si ? "bg-validated" : i === si ? "bg-violet" : "bg-cold-soft"}`}
              />
            ))}
          </div>
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-cold">
              Etapa {si + 1} de 5
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-extrabold">{so.label}</span>
              <StageTooltip goal={plan.goal} items={plan.items} />
            </div>
            <div className="text-xs text-cold">{so.sub}</div>
          </div>
        </div>
        <div className="text-left md:text-right">
          <Button primary disabled={lastStage} onClick={onMove}>
            {lastStage ? "Deal en cierre" : `Avanzar a ${nextLabel} →`}
          </Button>
        </div>
      </div>
    </div>
  );
}
