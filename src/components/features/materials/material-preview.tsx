import type { DeckRequest, Material, MaterialBlock } from "@/types";
import { Empty, Gate, Overlay } from "@/components/ui";
import { DownloadButton } from "./download-button";
import { DeckConfigForm } from "./deck-config-form";

export interface MaterialPreviewProps {
  material: Material;
  /** Client-side pricing gate (overrides the baked-in `hidden` flag). */
  includePricing: boolean;
  /** Editable deck tokens (Presentación preview), pre-filled from the deal. */
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
        return <Empty text="Pricing oculto. Activá el toggle." />;
      if (block.confirmed)
        return (
          <div className="py-1 text-[13px] font-bold text-validated">
            USD {block.mrr}/mes · confirmado ✓
          </div>
        );
      return (
        <div className="rounded-lg border border-inferred/30 bg-inferred-soft p-3 text-[13px] text-inferred">
          <b>Possibly MRR ≈ USD {block.mrr}/mes</b> — estimado. Hereda el{" "}
          <code>possibly</code> hasta confirmar.
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
  const previewTitle =
    material.key === "pres"
      ? `Presentación - ${deckConfig.clientName}`
      : material.title;
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
              Configurar presentación
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
