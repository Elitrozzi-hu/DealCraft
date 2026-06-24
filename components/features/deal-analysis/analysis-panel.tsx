"use client";

import { useState, type ReactNode } from "react";
import type {
  Deal,
  DealMeta,
  Pain,
  PainDraft,
  Provenance,
  Stakeholder,
  StakeholderDraft,
  TechKind,
} from "@/types";
import { Button, Card, Input, ProvenanceBadge } from "@/components/ui";
import { CompsBlock } from "./comps-block";
import { SolutionGraph } from "./solution-graph";
import { StakeholdersBlock } from "./stakeholders-block";

export interface AnalysisPanelProps {
  deal: Deal;
  meta: DealMeta;
  coldStart: boolean;
  possiblyMRR: number;
  mrrConfirmed: boolean;
  onConfirmMRR: () => void;
  onEditMRR: (value: number) => void;
  onValidateHeadcount: () => void;
  stakeholders: Stakeholder[];
  onValidateStakeholder: (id: string) => void;
  onAddStakeholder: (draft: StakeholderDraft) => void;
  onUpdateStakeholder: (id: string, patch: Partial<StakeholderDraft>) => void;
  onRemoveStakeholder: (id: string) => void;
  pains: Pain[];
  onValidatePain: (id: string) => void;
  onAddPain: (draft: PainDraft) => void;
  onRemovePain: (id: string) => void;
}

type SubTab = "empresa" | "solucion" | "intel";

const kLabelCls = "text-[10px] font-bold uppercase tracking-wide text-cold";

const techBorderLeft: Record<TechKind, string> = {
  desplazar: "border-l-risk",
  integrar: "border-l-validated",
  coexistir: "border-l-cold",
};

function Section({
  title,
  right,
  sub,
  children,
}: {
  title: string;
  right?: ReactNode;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <Card pad="sm">
      <div
        className={`flex items-center justify-between gap-2 ${sub ? "mb-1" : "mb-2.5"}`}
      >
        <div className="text-sm font-extrabold">{title}</div>
        {right}
      </div>
      {sub && <div className="mb-2.5 text-[11.5px] text-cold">{sub}</div>}
      {children}
    </Card>
  );
}

function KMetric({
  label,
  v,
  prov,
  highlight,
}: {
  label: string;
  v: string;
  prov?: Provenance;
  highlight?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border p-2.5 ${highlight ? "border-violet/30 bg-violet-soft" : "border-line bg-panel"}`}
    >
      <div className={`${kLabelCls} ${highlight ? "text-violet" : ""}`}>
        {label}
      </div>
      <div
        className={`mt-0.5 break-words text-[13.5px] font-bold leading-tight ${highlight ? "text-violet" : "text-ink"}`}
      >
        {v}
      </div>
      {prov && (
        <div className="mt-2">
          <ProvenanceBadge {...prov} compact />
        </div>
      )}
    </div>
  );
}

export function AnalysisPanel(props: AnalysisPanelProps) {
  const {
    deal,
    meta,
    coldStart,
    possiblyMRR,
    mrrConfirmed,
    onConfirmMRR,
    onEditMRR,
    onValidateHeadcount,
    stakeholders,
    onValidateStakeholder,
    onAddStakeholder,
    onUpdateStakeholder,
    onRemoveStakeholder,
    pains,
    onValidatePain,
    onAddPain,
    onRemovePain,
  } = props;

  const f = deal.firmographics;
  const [sub, setSub] = useState<SubTab>("empresa");
  const [editingMRR, setEditingMRR] = useState(false);
  const [mrrDraft, setMrrDraft] = useState("");

  const openEditMRR = () => {
    setMrrDraft(String(possiblyMRR));
    setEditingMRR(true);
  };
  const saveMRR = () => {
    const v = Number(mrrDraft);
    if (!Number.isFinite(v) || v < 0) return;
    onEditMRR(v);
    setEditingMRR(false);
  };
  const subTabs: [SubTab, string][] = [
    ["empresa", "Empresa"],
    ["solucion", "Solución"],
    ["intel", "Comparables"],
  ];
  const subSub =
    sub === "empresa"
      ? "Contexto y stakeholders del deal."
      : sub === "solucion"
        ? "Del dolor al módulo, recorriendo el solution graph."
        : "Precedentes comparables del deal.";

  return (
    <div className="grid gap-3">
      {coldStart && (
        <div className="flex items-start gap-2.5 rounded-xl border border-cold/30 bg-cold-soft px-3.5 py-3">
          <span aria-hidden>○</span>
          <div className="text-[12.5px]">
            <b>Cold start.</b>{" "}
            <span className="text-cold">
              Todo inferido, baja confianza. No fabricamos data: marcamos qué
              validar.
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-1 rounded-xl border border-line bg-panel p-1">
        {subTabs.map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSub(k)}
            className={`flex-1 rounded-lg px-1.5 py-2.5 text-[13px] font-bold ${sub === k ? "bg-violet text-white" : "text-cold"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="-mt-1.5 text-xs text-cold">{subSub}</div>

      {sub === "empresa" && (
        <>
          <Section title="Contexto">
            <p className="m-0 mb-3.5 mt-0.5 text-[13px] leading-relaxed text-ink">
              {f.summary.value}
            </p>
            <div className={`${kLabelCls} mb-2`}>Key metrics</div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
              <KMetric label="Región" v={meta.region} />
              <KMetric label="Industria" v={meta.industry} prov={f.industry.prov} />
              <KMetric label="Workforce" v={meta.deskless} highlight prov={f.deskless.prov} />
              {!meta.headcountConflict ? (
                <KMetric label="Headcount" v={`${meta.headcount} empleados`} />
              ) : (
                <div className="rounded-xl border border-inferred/30 bg-inferred-soft p-2.5">
                  <div className={kLabelCls}>Headcount · conflicto</div>
                  <div className="mt-0.5 text-[13px] font-bold">450 vs 520</div>
                  <button
                    type="button"
                    onClick={onValidateHeadcount}
                    className="mt-1 text-[11.5px] font-bold text-violet"
                  >
                    resolver → 485
                  </button>
                </div>
              )}
            </div>
            <div className={`${kLabelCls} mb-2 mt-4`}>
              Tech stack ({f.tech.length})
            </div>
            <div className="flex flex-wrap gap-[7px]">
              {f.tech.map((t) => (
                <span
                  key={t.t}
                  title={t.kind}
                  className={`rounded-md border border-line border-l-[3px] bg-panel px-2.5 py-1 text-xs font-semibold text-ink ${techBorderLeft[t.kind]}`}
                >
                  {t.t}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Stakeholders">
            <StakeholdersBlock
              stakeholders={stakeholders}
              onValidate={onValidateStakeholder}
              onAdd={onAddStakeholder}
              onUpdate={onUpdateStakeholder}
              onRemove={onRemoveStakeholder}
            />
          </Section>
        </>
      )}

      {sub === "solucion" && (
        <>
          <Section
            title="Dolores → Solución"
            sub="Cada dolor se mapea a un módulo de Humand recorriendo el solution graph."
          >
            <SolutionGraph
              pains={pains}
              dominantId={null}
              onValidate={onValidatePain}
              onAdd={onAddPain}
              onRemove={onRemovePain}
            />
          </Section>

          <Section
            title={mrrConfirmed ? "MRR confirmado" : "Posible MRR"}
            sub="Valor del deal estimado por headcount × precio. Se confirma cuando el decisor está involucrado."
          >
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div>
                {editingMRR ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[15px] font-bold text-cold">USD</span>
                    <Input
                      id="mrr-edit"
                      compact
                      type="number"
                      min={0}
                      className="w-28"
                      value={mrrDraft}
                      onChange={(e) => setMrrDraft(e.target.value)}
                    />
                    <span className="text-xs text-cold">/ mes</span>
                    <Button small primary onClick={saveMRR}>
                      Guardar
                    </Button>
                    <Button small onClick={() => setEditingMRR(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-[26px] font-extrabold ${mrrConfirmed ? "text-validated" : "text-inferred"}`}
                    >
                      USD {possiblyMRR}
                    </span>
                    <span className="text-xs text-cold">/ mes</span>
                    {!mrrConfirmed && (
                      <span className="rounded-md bg-inferred-soft px-1.5 py-0.5 text-[10.5px] font-bold text-inferred">
                        estimado
                      </span>
                    )}
                    {!mrrConfirmed && (
                      <button
                        type="button"
                        onClick={openEditMRR}
                        aria-label="Editar MRR"
                        title="Editar MRR"
                        className="ml-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center self-center rounded-full border border-line bg-panel text-cold transition-all hover:border-violet/40 hover:bg-violet-soft hover:text-violet hover:shadow-[0_1px_4px_rgba(44,90,246,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet/50 active:scale-95"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-[15px] w-[15px]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="max-w-[180px] text-right">
                {mrrConfirmed ? (
                  <span className="text-xs font-bold text-validated">
                    ✓ Cifra cerrada
                    <br />
                    elegible en el proposal
                  </span>
                ) : (
                  <Button small primary onClick={onConfirmMRR}>
                    Confirmar MRR
                  </Button>
                )}
              </div>
            </div>
          </Section>
        </>
      )}

      {sub === "intel" && (
        <Section title="Casos comparables">
          <CompsBlock />
        </Section>
      )}
    </div>
  );
}
