import { useEffect, useState } from "react";
import type {
  Deal,
  DealMeta,
  DeckRequest,
  Language,
  PreCallBrief,
  PublishedSuccessCase,
  MaterialsRequest,
  Segment,
  SignalItem,
  StageKey,
  Stakeholder,
} from "@/types";
import { segmentOf } from "@/lib/constants";
import { Card } from "@/components/ui";
import { useIsNarrow } from "@/hooks/use-is-narrow";
import { useDealState } from "@/hooks/use-deal-state";
import { useMaterials } from "@/hooks/use-materials";
import {
  AnalysisPanel,
  DealHeader,
} from "@/components/features/deal-analysis";
import { DiscoveryPanel } from "@/components/features/discovery";
import { MaterialsPanel } from "@/components/features/materials";
import { useT } from "@/i18n";

function MaterialsGlyph() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="flex-shrink-0"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function DiscoveryGlyph() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="flex-shrink-0"
    >
      <path d="M21 11.5a8.4 8.4 0 0 1-11.8 7.7L3 21l1.9-5.7A8.4 8.4 0 1 1 21 11.5z" />
    </svg>
  );
}

/** Firmographics overridden when a deal is opened from history. */
export interface ActiveMeta {
  industry: string;
  headcount: number;
  deskless: string;
  region: string;
  website: string;
}

export interface CopilotViewProps {
  deal: Deal;
  stakeholders: Stakeholder[];
  stage: StageKey;
  resolvedName: string;
  coldStart: boolean;
  /** Present when opened from the recent-deals history. */
  activeMeta: ActiveMeta | null;
  website: string;
  successCases: PublishedSuccessCase[];
  initialSignals: SignalItem[] | null;
  initialBrief: PreCallBrief | null;
  /** Language the analysis content was generated in (drives the stale-language note). */
  contentLanguage: Language;
  /** Back to the input screen (triggered by the DealCraft wordmark). */
  onBack: () => void;
}

export function CopilotView({
  deal,
  stakeholders,
  stage,
  resolvedName,
  coldStart,
  activeMeta,
  website,
  successCases,
  initialSignals,
  initialBrief,
  contentLanguage,
  onBack,
}: CopilotViewProps) {
  const narrow = useIsNarrow();
  const t = useT();
  const [rightTab, setRightTab] = useState<"materials" | "discovery">("materials");
  const headcount = activeMeta ? activeMeta.headcount : deal.firmographics.headcount;
  const ds = useDealState({ stakeholders, stage });
  const materials = useMaterials();

  const includePricing = true;

  const VALID_SEGMENTS: Segment[] = ["Enterprise", "Mid-Market", "SMB"];
  const hubSegment = deal.hubspot.segment;
  const segment: Segment = VALID_SEGMENTS.includes(hubSegment as Segment)
    ? (hubSegment as Segment)
    : segmentOf(headcount);

  const meta: DealMeta = {
    name: resolvedName.split(" — ")[0],
    industry: activeMeta?.industry ?? deal.firmographics.industry.value,
    region: activeMeta?.region ?? deal.region,
    deskless: activeMeta?.deskless ?? deal.firmographics.deskless.value,
    headcount,
    segment,
    website: activeMeta?.website ?? website,
    headcountConflict:
      !activeMeta &&
      !ds.headcountValidated &&
      deal.firmographics.headcountProv.sourceType
        .toLowerCase()
        .includes("conflicto"),
  };

  const { generate } = materials;
  const stakeholdersKey = ds.stakeholders
    .map((s) => `${s.id}:${s.role}`)
    .join("|");
  const mrr = deal.hubspot.amount ?? 0;
  const mrrConfirmed = deal.hubspot.amount != null;

  useEffect(() => {
    const req: MaterialsRequest = {
      companyName: resolvedName,
      stakeholders: ds.stakeholders,
      includePricing,
      mrr,
      mrrConfirmed,
    };
    void generate(req);
  }, [
    generate,
    resolvedName,
    includePricing,
    mrr,
    mrrConfirmed,
    stakeholdersKey,
  ]);
  const [deckConfig, setDeckConfig] = useState<DeckRequest>(() => ({
    clientName: meta.name,
    date: new Date().toISOString().slice(0, 10),
    logo: "",
    users: meta.headcount,
    mrr,
    mrr_disc: Math.round(mrr * 0.85),
    users_a: meta.headcount,
    mrr_a: mrr,
    mrr_disc_a: Math.round(mrr * 0.9),
    users_b: meta.headcount,
    mrr_b: mrr,
    mrr_disc_b: Math.round(mrr * 0.8),
  }));

  const retryMaterials = () =>
    void generate({
      companyName: resolvedName,
      stakeholders: ds.stakeholders,
      includePricing,
      mrr,
      mrrConfirmed,
    });

  return (
    <div className="min-h-screen">
      <DealHeader
        meta={meta}
        dealStage={deal.hubspot.dealStage}
        amount={deal.hubspot.amount}
        onBack={onBack}
      />

      <div className="mx-auto w-full max-w-[1760px] px-4 pb-16 pt-4 sm:px-6 md:pb-20 md:pt-5 lg:px-10">
        <div
          className={`grid items-start gap-5 lg:gap-8 ${narrow ? "grid-cols-1" : "grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]"}`}
        >
          <div>
            <div className="mb-3">
              <div className="text-[17px] font-extrabold tracking-tight">
                {t("copilot.analysisTitle")}
              </div>
              <div className="text-[13px] text-cold">
                {t("copilot.analysisSub")}
              </div>
            </div>
            <AnalysisPanel
              deal={deal}
              meta={meta}
              coldStart={coldStart}
              contentLanguage={contentLanguage}
              onValidateHeadcount={ds.validateHeadcount}
              stakeholders={ds.stakeholders}
              onValidateStakeholder={ds.validateStakeholder}
              onAddStakeholder={ds.addStakeholder}
              onUpdateStakeholder={ds.updateStakeholder}
              onRemoveStakeholder={ds.removeStakeholder}
              successCases={successCases}
              initialSignals={initialSignals}
              initialBrief={initialBrief}
            />
          </div>

          <div className="grid content-start gap-4">
            <div>
              <div className="mb-3">
                <div className="text-[17px] font-extrabold tracking-tight">
                  {t("copilot.resourcesTitle")}
                </div>
                <div className="text-[13px] text-cold">
                  {t("copilot.resourcesSub")}
                </div>
              </div>
              <div
                role="tablist"
                className="inline-flex w-fit gap-1 rounded-2xl bg-surface p-1.5"
              >
                {(["materials", "discovery"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={rightTab === key}
                    onClick={() => setRightTab(key)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50 ${
                      rightTab === key
                        ? "bg-violet text-white shadow-[0_2px_8px_rgba(44,90,246,0.25)]"
                        : "text-cold hover:bg-cold-soft hover:text-ink"
                    }`}
                  >
                    {key === "materials" ? <MaterialsGlyph /> : <DiscoveryGlyph />}
                    {key === "materials"
                      ? t("copilot.materialsTitle")
                      : t("discovery.header.title")}
                  </button>
                ))}
              </div>
            </div>

            {rightTab === "materials" && (
              <Card
                pad="md"
                title={t("copilot.materialsTitle")}
                sub={t("copilot.materialsSub")}
              >
                <MaterialsPanel
                  materials={materials.materials}
                  status={materials.status}
                  error={materials.error}
                  includePricing={includePricing}
                  deckConfig={deckConfig}
                  onDeckConfigChange={setDeckConfig}
                  onRetry={retryMaterials}
                />
              </Card>
            )}

            {rightTab === "discovery" && <DiscoveryPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
