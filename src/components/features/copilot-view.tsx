import { useEffect, useState } from "react";
import type {
  Deal,
  DealMeta,
  DeckRequest,
  Language,
  PublishedSuccessCase,
  MaterialsRequest,
  Segment,
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
import { MaterialsPanel } from "@/components/features/materials";
import { useT } from "@/i18n";

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
  contentLanguage,
  onBack,
}: CopilotViewProps) {
  const narrow = useIsNarrow();
  const t = useT();
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
            />
          </div>

          <div className="grid content-start gap-4">
            <div>
              <div className="text-[17px] font-extrabold tracking-tight">
                {t("copilot.materialsTitle")}
              </div>
              <div className="text-[13px] text-cold">
                {t("copilot.materialsSub")}
              </div>
            </div>
            <Card pad="md">
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
          </div>
        </div>
      </div>
    </div>
  );
}
