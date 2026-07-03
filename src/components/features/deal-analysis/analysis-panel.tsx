import { useMemo, useState, type ReactNode } from "react";
import type {
  Deal,
  DealMeta,
  Language,
  PublishedSuccessCase,
  Provenance,
  Stakeholder,
  StakeholderDraft,
  TechKind,
} from "@/types";
import {
  Card,
  LinkButton,
  ProvenanceBadge,
  SourceLinkButton,
  StaleLanguageNote,
  StatusDot,
} from "@/components/ui";
import { useLanguage, useT, type MessageKey } from "@/i18n";
import { CompsBlock } from "./comps-block";
import { PreCallBriefBlock } from "./pre-call-brief-block";
import { SignalsBlock } from "./signals-block";
import { StakeholdersBlock } from "./stakeholders-block";
import type { PreCallBriefRequest } from "@/types";

export interface AnalysisPanelProps {
  deal: Deal;
  meta: DealMeta;
  coldStart: boolean;
  /** Language the analysis content was generated in (drives the stale-language note). */
  contentLanguage: Language;
  onValidateHeadcount: () => void;
  stakeholders: Stakeholder[];
  onValidateStakeholder: (id: string) => void;
  onAddStakeholder: (draft: StakeholderDraft) => void;
  onUpdateStakeholder: (id: string, patch: Partial<StakeholderDraft>) => void;
  onRemoveStakeholder: (id: string) => void;
  successCases: PublishedSuccessCase[];
}

type SubTab = "empresa" | "intel" | "signals" | "brief";

const kLabelCls = "text-[10px] font-bold uppercase tracking-wide text-cold";

const techBorderLeft: Record<TechKind, string> = {
  desplazar: "border-l-risk",
  integrar: "border-l-validated",
  coexistir: "border-l-cold",
};

// TechKind enum values stay the logic key; only the displayed label is localized.
const TECHKIND_LABEL_KEY: Record<TechKind, MessageKey> = {
  desplazar: "panel.techKind.desplazar",
  integrar: "panel.techKind.integrar",
  coexistir: "panel.techKind.coexistir",
};

const SUBTAB_ICONS: Record<SubTab, ReactNode> = {
  empresa: (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      <rect x="3" y="7" width="18" height="13" rx="1.5" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  intel: (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      <path d="M12 17.3l-6.2 3.3 1.2-6.9L2 9.2l7-.9L12 2l3 6.3 7 .9-5 4.5 1.2 6.9z" />
    </svg>
  ),
  signals: (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      <path d="M4 11a8 8 0 0 1 16 0M7 11a5 5 0 0 1 10 0M12 11v9" />
    </svg>
  ),
  brief: (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
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
  tooltip,
}: {
  label: string;
  v: string;
  prov?: Provenance;
  highlight?: boolean;
  tooltip?: string;
}) {
  const t = useT();
  return (
    <div
      className={`min-w-0 rounded-xl border p-2.5 ${highlight ? "border-violet/30 bg-violet-soft" : "border-line bg-panel"}`}
    >
      <div className={`flex items-center gap-1 ${kLabelCls} ${highlight ? "text-violet" : ""}`}>
        {prov && <StatusDot status={prov.status} size={6} />}
        {label}
        {tooltip && (
          <span tabIndex={0} role="note" className="group/tip relative cursor-help rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-violet/50" aria-label={tooltip}>
            <svg width={11} height={11} viewBox="0 0 16 16" fill="currentColor" aria-hidden className="opacity-50 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11ZM8 5a.75.75 0 1 0 0 1.5A.75.75 0 0 0 8 5Zm-.75 2.75a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0v-3Z"/>
            </svg>
            <span className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-1.5 w-48 -translate-x-1/2 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[11px] leading-snug text-ink opacity-0 shadow-md transition-opacity group-hover/tip:visible group-hover/tip:opacity-100 group-focus-within/tip:visible group-focus-within/tip:opacity-100">
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
        <div className="mt-2 flex items-center gap-1.5">
          <ProvenanceBadge {...prov} compact url={undefined} />
          {prov.url && (
            <SourceLinkButton
              href={prov.url}
              title={t("panel.openSourceWith", { source: prov.source })}
            />
          )}
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
    contentLanguage,
    onValidateHeadcount,
    stakeholders,
    onValidateStakeholder,
    onAddStakeholder,
    onUpdateStakeholder,
    onRemoveStakeholder,
    successCases,
  } = props;

  const t = useT();
  const { lang } = useLanguage();
  const f = deal.firmographics;
  const [sub, setSub] = useState<SubTab>("empresa");
  const [signalCount, setSignalCount] = useState<number | null>(null);
  const [briefCount, setBriefCount] = useState<number | null>(null);
  const briefRequest = useMemo<PreCallBriefRequest>(
    () => ({
      company: meta.name,
      hubspotDealId: deal.hubspot.dealId,
      industry: meta.industry,
      region: meta.region,
      headcount: meta.headcount != null ? String(meta.headcount) : "",
      stakeholders: stakeholders.map((s) => ({
        name: s.name,
        title: s.title,
        role: s.role,
      })),
      comparableCases: successCases.map((c) => {
        const cc = c.content[lang] ?? c.content.es;
        return {
          company: c.company,
          industry: cc.industry,
          pains: cc.pains,
          modules: cc.modules,
          metrics: cc.metrics.map((m) => ({ value: m.value, label: m.label })),
          quote: cc.quote,
          sourceUrl: c.link_web ?? c.link_doc ?? null,
        };
      }),
    }),
    [meta, deal.hubspot.dealId, stakeholders, successCases, lang],
  );

  const subTabs: [SubTab, string][] = [
    ["empresa", t("panel.tab.company")],
    [
      "intel",
      successCases.length > 0
        ? `${t("panel.tab.cases")} · ${successCases.length}`
        : t("panel.tab.cases"),
    ],
    [
      "signals",
      signalCount !== null
        ? `${t("panel.tab.signals")} · ${signalCount}`
        : t("panel.tab.signals"),
    ],
    [
      "brief",
      briefCount !== null
        ? `${t("panel.tab.briefShort")} · ${briefCount}`
        : t("panel.tab.brief"),
    ],
  ];
  const subSub =
    sub === "empresa"
      ? t("panel.sub.company")
      : sub === "intel"
        ? t("panel.sub.cases")
        : sub === "signals"
          ? t("panel.sub.signals")
          : t("panel.sub.brief");

  return (
    <div className="grid gap-3">
      <StaleLanguageNote contentLang={contentLanguage} />

      {coldStart && (
        <div className="flex items-start gap-2.5 rounded-xl border border-inferred/30 bg-inferred-soft px-3.5 py-3">
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-px flex-shrink-0 text-inferred"
            aria-hidden
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div className="text-[12.5px] text-inferred">
            <b>{t("panel.coldStart.title")}</b>{" "}
            <span className="opacity-80">{t("panel.coldStart.body")}</span>
          </div>
        </div>
      )}

      <div role="tablist" className="flex gap-1 rounded-xl border border-line bg-panel p-1">
        {subTabs.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={sub === k}
            onClick={() => setSub(k)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-1.5 py-2.5 text-[12.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50 ${sub === k ? "bg-violet text-white shadow-sm" : "text-cold hover:bg-cold-soft hover:text-ink"}`}
          >
            {SUBTAB_ICONS[k]}
            {l}
          </button>
        ))}
      </div>
      <div className="-mt-1.5 text-xs text-cold">{subSub}</div>

      {sub === "empresa" && (
        <>
          <Section title={t("panel.section.context")}>
            <p className="m-0 mt-0.5 text-[13px] leading-relaxed text-ink">
              {f.summary.value}
            </p>
            <div className="mb-3.5 mt-2 flex items-center gap-1.5">
              <ProvenanceBadge {...f.summary.prov} url={undefined} />
              {f.summary.prov.url && (
                <SourceLinkButton
                  href={f.summary.prov.url}
                  title={t("panel.openSourceWith", {
                    source: f.summary.prov.source,
                  })}
                />
              )}
            </div>
            <div className={`${kLabelCls} mb-2`}>{t("panel.keyMetrics")}</div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
              <KMetric label={t("panel.metric.region")} v={meta.region} prov={f.regionProv} />
              <KMetric label={t("panel.metric.industry")} v={meta.industry} prov={f.industry.prov} />
              <KMetric label={t("panel.metric.workforce")} v={meta.deskless} highlight prov={f.deskless.prov} />
              {deal.hubspot.integraciones && (
                <KMetric
                  label={t("panel.metric.integratedSystems")}
                  v={deal.hubspot.integraciones}
                  tooltip={t("panel.metric.integratedSystemsTooltip")}
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
                  label={t("panel.metric.headcount")}
                  v={t("panel.metric.headcountValue", { count: meta.headcount })}
                  prov={f.headcountProv}
                />
              ) : (
                <div className="rounded-xl border border-inferred/30 bg-inferred-soft p-2.5">
                  <div className={kLabelCls}>
                    {t("panel.metric.headcountConflict")}
                  </div>
                  <div className="mt-0.5 text-[13px] font-bold">450 vs 520</div>
                  <div className="mt-1">
                    <LinkButton onClick={onValidateHeadcount}>
                      {t("panel.metric.resolveHeadcount")}
                    </LinkButton>
                  </div>
                </div>
              )}
            </div>
            {f.tech.length > 0 && (
              <>
                <div className={`${kLabelCls} mb-2 mt-4`}>
                  {t("panel.techStack", { count: f.tech.length })}
                </div>
                <div className="flex flex-wrap gap-[7px]">
                  {f.tech.map((tech) => {
                    const chipCls = `inline-flex items-center gap-1 rounded-md border border-line border-l-[3px] bg-panel px-2.5 py-1 text-xs font-semibold text-ink ${techBorderLeft[tech.kind]}`;
                    const url =
                      tech.prov?.status !== "inferred" ? tech.prov?.url : undefined;
                    return (
                      <span key={tech.t} className="inline-flex items-center gap-1">
                        <span
                          title={t(TECHKIND_LABEL_KEY[tech.kind])}
                          className={chipCls}
                        >
                          {tech.t}
                        </span>
                        {url && (
                          <SourceLinkButton
                            href={url}
                            title={`${t(TECHKIND_LABEL_KEY[tech.kind])} · ${
                              tech.prov?.source ?? t("panel.sourceFallback")
                            }`}
                          />
                        )}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </Section>

          <Section title={t("panel.section.stakeholders")}>
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

      {sub === "intel" && (
        <Section title={t("panel.tab.cases")}>
          <CompsBlock successCases={successCases} />
        </Section>
      )}

      {sub === "signals" && (
        <Section title={t("panel.tab.signals")}>
          <SignalsBlock
            company={deal.entity.resolved}
            domain={meta.website}
            hubspotDealId={deal.hubspot.dealId}
            onCountChange={setSignalCount}
          />
        </Section>
      )}

      {sub === "brief" && (
        <Section title={t("panel.tab.brief")}>
          <PreCallBriefBlock
            request={briefRequest}
            onCountChange={setBriefCount}
          />
        </Section>
      )}
    </div>
  );
}
