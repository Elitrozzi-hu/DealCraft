import { useEffect, useState } from "react";
import type {
  Deal,
  DealMeta,
  DeckRequest,
  PublishedSuccessCase,
  MaterialsRequest,
  Pain,
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
  pains: Pain[];
  stage: StageKey;
  resolvedName: string;
  coldStart: boolean;
  /** Present when opened from the recent-deals history. */
  activeMeta: ActiveMeta | null;
  website: string;
  successCases: PublishedSuccessCase[];
  /** Back to the input screen (triggered by the DealCraft wordmark). */
  onBack: () => void;
}

export function CopilotView({
  deal,
  stakeholders,
  pains,
  stage,
  resolvedName,
  coldStart,
  activeMeta,
  website,
  successCases,
  onBack,
}: CopilotViewProps) {
  const narrow = useIsNarrow();
  // History opens from `activeMeta`; a fresh analysis uses the enriched
  // firmographics carried on `deal`.
  const headcount = activeMeta ? activeMeta.headcount : deal.firmographics.headcount;
  const ds = useDealState({ stakeholders, pains, stage });
  const materials = useMaterials();

  // Pricing toggle was removed from the UI — materials always include pricing.
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
    // Only flag a conflict when the data source reports one — Classidy returns a
    // single headcount value, so this is normally false.
    headcountConflict:
      !activeMeta &&
      !ds.headcountValidated &&
      deal.firmographics.headcountProv.sourceType
        .toLowerCase()
        .includes("conflicto"),
  };

  // Regenerate materials when the gated inputs change (validated pains, pricing).
  // Idle/loading/error/success surface in MaterialsPanel.
  const { generate } = materials;
  const painsKey = ds.pains
    .map((p) => `${p.id}:${p.validated ? 1 : 0}:${p.module ?? ""}`)
    .join("|");
  const stakeholdersKey = ds.stakeholders
    .map((s) => `${s.id}:${s.role}`)
    .join("|");
  // Pricing is the HubSpot deal amount (the only figure we carry from the CRM);
  // "confirmed" when HubSpot actually has an amount, absent → 0.
  const mrr = deal.hubspot.amount ?? 0;
  const mrrConfirmed = deal.hubspot.amount != null;

  useEffect(() => {
    const req: MaterialsRequest = {
      companyName: resolvedName,
      pains: ds.pains,
      stakeholders: ds.stakeholders,
      includePricing,
      mrr,
      mrrConfirmed,
    };
    void generate(req);
    // ds.pains/ds.stakeholders captured via stable key strings below.
  }, [
    generate,
    resolvedName,
    includePricing,
    mrr,
    mrrConfirmed,
    painsKey,
    stakeholdersKey,
  ]);

  // Deck `{{…}}` tokens — pre-filled from the deal, then user-editable in the
  // Presentación preview (DeckConfigForm). Initialized once per deal session.
  // TODO (PLAN Task 9): refine the deal→deck mapping (plan A/B tiers).
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
      pains: ds.pains,
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
          {/* LEFT: Analysis */}
          <div>
            <div className="mb-3">
              <div className="text-[17px] font-extrabold tracking-tight">
                Análisis del deal
              </div>
              <div className="text-[13px] text-cold">
                Contexto, stakeholders, dolores y señales del mercado.
              </div>
            </div>
            <AnalysisPanel
              deal={deal}
              meta={meta}
              coldStart={coldStart}
              onValidateHeadcount={ds.validateHeadcount}
              stakeholders={ds.stakeholders}
              onValidateStakeholder={ds.validateStakeholder}
              onAddStakeholder={ds.addStakeholder}
              onUpdateStakeholder={ds.updateStakeholder}
              onRemoveStakeholder={ds.removeStakeholder}
              pains={ds.pains}
              onValidatePain={ds.validatePain}
              onAddPain={ds.addPain}
              onRemovePain={ds.removePain}
              successCases={successCases}
            />
          </div>

          {/* RIGHT: Materials */}
          <div className="grid content-start gap-4">
            <div>
              <div className="text-[17px] font-extrabold tracking-tight">
                Materiales de venta
              </div>
              <div className="text-[13px] text-cold">
                Personalizados para este deal. Revisá y descargá antes de la
                reunión.
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
