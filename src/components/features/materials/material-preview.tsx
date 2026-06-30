import type { DeckRequest, Material, MaterialBlock } from "@/types";
import { Empty, Gate, Overlay } from "@/components/ui";
import { useT } from "@/i18n";
import { DownloadButton } from "./download-button";
import { DeckConfigForm } from "./deck-config-form";
import { MATERIAL_TITLE_KEY } from "./material-labels";

export interface MaterialPreviewProps {
  material: Material;
  includePricing: boolean;
  deckConfig: DeckRequest;
  onDeckConfigChange: (value: DeckRequest) => void;
  onClose: () => void;
}

function Block({
  block,
  includePricing,
}: {
  block: MaterialBlock;
  includePricing: boolean;
}) {
  const t = useT();
  switch (block.type) {
    case "heading":
      return <h3 className="mb-2 mt-1 text-lg font-extrabold">{block.text}</h3>;
    case "subheading":
      return (
        <h4 className="mb-1.5 mt-4 text-xs font-extrabold uppercase tracking-wide text-cold">
          {block.text}
        </h4>
      );
    case "paragraph":
      return (
        <p className="text-[13.5px] leading-relaxed text-ink">{block.text}</p>
      );
    case "item":
      return <div className="py-1 text-[13px] leading-relaxed text-ink">{block.text}</div>;
    case "gate":
      return <Gate ok={block.ok} message={block.message} />;
    case "empty":
      return <Empty text={block.text} />;
    case "pricing":
      if (!includePricing)
        return <Empty text={t("materials.pricingHidden")} />;
      if (block.confirmed)
        return (
          <div className="py-1 text-[13px] font-bold text-validated">
            {t("materials.pricingConfirmed", { mrr: block.mrr })}
          </div>
        );
      return (
        <div className="rounded-lg border border-inferred/30 bg-inferred-soft p-3 text-[13px] text-inferred">
          <b>{t("materials.pricingEstimateBold", { mrr: block.mrr })}</b>{" "}
          {t("materials.pricingEstimateBefore")} <code>possibly</code>{" "}
          {t("materials.pricingEstimateAfter")}
        </div>
      );
    default:
      return null;
  }
}

export function MaterialPreview({
  material,
  includePricing,
  deckConfig,
  onDeckConfigChange,
  onClose,
}: MaterialPreviewProps) {
  const t = useT();
  const previewTitle =
    material.key === "pres"
      ? t("materials.presentationTitle", { client: deckConfig.clientName })
      : t(MATERIAL_TITLE_KEY[material.key]);
  return (
    <Overlay title={previewTitle} onClose={onClose} wide>
      <div>
        {material.blocks.map((block, i) => (
          <Block
            key={`${block.type}-${"text" in block ? block.text : i}`}
            block={block}
            includePricing={includePricing}
          />
        ))}
        {material.key === "pres" && (
          <div className="mt-5 border-t border-line pt-4">
            <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-cold">
              {t("materials.configurePresentation")}
            </h4>
            <DeckConfigForm value={deckConfig} onChange={onDeckConfigChange} />
            <div className="mt-4">
              <DownloadButton deckRequest={deckConfig} />
            </div>
          </div>
        )}
      </div>
    </Overlay>
  );
}
