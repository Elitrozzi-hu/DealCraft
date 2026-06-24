"use client";

import { useState } from "react";
import type { DeckRequest, Material, MaterialTagTone } from "@/types";
import { Button, Spinner } from "@/components/ui";
import { MaterialPreview } from "./material-preview";

export interface MaterialsPanelProps {
  materials: Material[];
  status: "idle" | "loading" | "error" | "success";
  error: string | null;
  includePricing: boolean;
  deckConfig: DeckRequest;
  onDeckConfigChange: (value: DeckRequest) => void;
  /** Retry materials generation (error state). */
  onRetry?: () => void;
}

const tagCls: Record<MaterialTagTone, string> = {
  ok: "text-validated bg-validated-soft",
  inferred: "text-inferred bg-inferred-soft",
  info: "text-violet bg-violet-soft",
  cold: "text-cold bg-cold-soft",
};

export function MaterialsPanel({
  materials,
  status,
  error,
  includePricing,
  deckConfig,
  onDeckConfigChange,
  onRetry,
}: MaterialsPanelProps) {
  const [active, setActive] = useState<Material | null>(null);

  return (
    <div className="grid gap-2.5">
      {status === "loading" && (
        <div className="flex items-center gap-2 py-6 text-[13px] text-cold">
          <Spinner /> Generando materiales…
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-start gap-2 rounded-xl bg-risk-soft px-3.5 py-3 text-[12.5px] text-risk">
          <span>{error ?? "No se pudieron generar los materiales."}</span>
          {onRetry && (
            <Button small onClick={onRetry}>
              Reintentar
            </Button>
          )}
        </div>
      )}

      {status !== "loading" && status !== "error" && materials.length === 0 && (
        <div className="rounded-xl border border-dashed border-line px-3.5 py-5 text-center text-[12.5px] text-cold">
          Todavía no hay materiales generados.
        </div>
      )}

      {materials.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => setActive(it)}
          className="rounded-xl border border-line bg-panel p-3.5 text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <b className="text-[13.5px]">{it.title}</b>
            <span
              className={`whitespace-nowrap rounded-md px-[7px] py-0.5 text-[10px] font-bold ${tagCls[it.tag.tone]}`}
            >
              {it.tag.label}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-cold">{it.sub}</div>
          <div className="mt-2 text-xs font-semibold text-violet">
            abrir preview →
          </div>
        </button>
      ))}

      {active && (
        <MaterialPreview
          material={active}
          includePricing={includePricing}
          deckConfig={deckConfig}
          onDeckConfigChange={onDeckConfigChange}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}
