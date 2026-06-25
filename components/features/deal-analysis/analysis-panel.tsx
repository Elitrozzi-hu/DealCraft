"use client";

import { useState, type ReactNode } from "react";
import type {
  Deal,
  DealMeta,
  HubSpotSuccessCase,
  Pain,
  PainDraft,
  Provenance,
  Stakeholder,
  StakeholderDraft,
  TechKind,
} from "@/types";
import {
  Card,
  EmptyState,
  ProvenanceBadge,
  ProvenanceLegend,
  SourceLinkButton,
} from "@/components/ui";
import { CompsBlock } from "./comps-block";
import { PainsBlock } from "./pains-block";
import { SignalsBlock } from "./signals-block";
import { StakeholdersBlock } from "./stakeholders-block";

export interface AnalysisPanelProps {
  deal: Deal;
  meta: DealMeta;
  coldStart: boolean;
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
  successCases: HubSpotSuccessCase[];
}

type SubTab = "empresa" | "dolores" | "intel" | "signals";

const kLabelCls = "text-[10px] font-bold uppercase tracking-wide text-cold";

const techBorderLeft: Record<TechKind, string> = {
  desplazar: "border-l-risk",
  integrar: "border-l-validated",
  coexistir: "border-l-cold",
};

// Section glyph for the empty tech-stack state — stacked layers.
function StackGlyph() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="M2 12l10 5 10-5M2 17l10 5 10-5" />
    </svg>
  );
}


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
  tooltip,
}: {
  label: string;
  v: string;
  prov?: Provenance;
  highlight?: boolean;
  tooltip?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border p-2.5 ${highlight ? "border-violet/30 bg-violet-soft" : "border-line bg-panel"}`}
    >
      <div className={`flex items-center gap-1 ${kLabelCls} ${highlight ? "text-violet" : ""}`}>
        {label}
        {tooltip && (
          <span className="group/tip relative cursor-help" aria-label={tooltip}>
            <svg width={11} height={11} viewBox="0 0 16 16" fill="currentColor" aria-hidden className="opacity-50 group-hover/tip:opacity-100">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11ZM8 5a.75.75 0 1 0 0 1.5A.75.75 0 0 0 8 5Zm-.75 2.75a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0v-3Z"/>
            </svg>
            <span className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-1.5 w-48 -translate-x-1/2 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[11px] leading-snug text-ink opacity-0 shadow-md transition-opacity group-hover/tip:visible group-hover/tip:opacity-100">
              {tooltip}
            </span>
          </span>
        )}
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
    successCases,
  } = props;

  const f = deal.firmographics;
  const [sub, setSub] = useState<SubTab>("empresa");
  const [signalCount, setSignalCount] = useState<number | null>(null);

  const subTabs: [SubTab, string][] = [
    ["empresa", "Empresa"],
    ["dolores", "Dolores"],
    ["intel", "Casos de éxito"],
    ["signals", signalCount !== null ? `Signals · ${signalCount}` : "Signals"],
  ];
  const subSub =
    sub === "empresa"
      ? "Contexto y stakeholders del deal."
      : sub === "dolores"
        ? "Puntos de dolor identificados para este deal."
        : sub === "intel"
          ? "Clientes similares que ya usan Humand."
          : "Signals recientes de la empresa — liderazgo, expansión, financiamiento.";

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
      <ProvenanceLegend className="rounded-xl border border-line bg-panel px-3 py-2" />

      {sub === "empresa" && (
        <>
          <Section title="Contexto">
            <p className="m-0 mt-0.5 text-[13px] leading-relaxed text-ink">
              {f.summary.value}
            </p>
            <div className="mb-3.5 mt-2">
              <ProvenanceBadge {...f.summary.prov} />
            </div>
            <div className={`${kLabelCls} mb-2`}>Key metrics</div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
              <KMetric label="Región" v={meta.region} prov={f.regionProv} />
              <KMetric label="Industria" v={meta.industry} prov={f.industry.prov} />
              <KMetric label="Workforce" v={meta.deskless} highlight prov={f.deskless.prov} />
              {deal.hubspot.integraciones && (
                <KMetric
                  label="Sistemas integrados"
                  v={deal.hubspot.integraciones}
                  tooltip="Sistemas de terceros con los que Humand se ha integrado en esta cuenta"
                  prov={{
                    source: "HubSpot",
                    sourceType: "declarado",
                    confidence: 1,
                    status: "validated",
                  }}
                />
              )}
              {!meta.headcountConflict ? (
                <KMetric
                  label="Headcount"
                  v={`${meta.headcount} empleados`}
                  prov={f.headcountProv}
                />
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
            {f.tech.length === 0 ? (
              <EmptyState
                icon={<StackGlyph />}
                title="Sin tecnología detectada"
                hint="No encontramos herramientas de RR.HH., nómina o comunicación interna con evidencia de uso. Aparecerán acá al detectarse."
              />
            ) : (
              <div className="flex flex-wrap gap-[7px]">
                {f.tech.map((t) => {
                  const chipCls = `inline-flex items-center gap-1 rounded-md border border-line border-l-[3px] bg-panel px-2.5 py-1 text-xs font-semibold text-ink ${techBorderLeft[t.kind]}`;
                  const url = t.prov?.status !== "inferred" ? t.prov?.url : undefined;
                  return (
                    <span key={t.t} className="inline-flex items-center gap-1">
                      <span title={t.kind} className={chipCls}>{t.t}</span>
                      {url && (
                        <SourceLinkButton
                          href={url}
                          title={`${t.kind} · ${t.prov?.source ?? "fuente"}`}
                        />
                      )}
                    </span>
                  );
                })}
              </div>
            )}
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

      {sub === "dolores" && (
        <Section title="Dolores">
          <PainsBlock
            pains={pains}
            onValidate={onValidatePain}
            onAdd={onAddPain}
            onRemove={onRemovePain}
          />
        </Section>
      )}

      {sub === "intel" && (
        <Section title="Casos de éxito">
          <CompsBlock hubspotSuccessCases={successCases} />
        </Section>
      )}

      {sub === "signals" && (
        <Section title="Signals">
          <SignalsBlock
            company={deal.entity.resolved}
            domain={meta.website}
            onCountChange={setSignalCount}
          />
        </Section>
      )}
    </div>
  );
}
