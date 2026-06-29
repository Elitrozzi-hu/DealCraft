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
  onRetry?: () => void;
}

const tagCls: Record<MaterialTagTone, string> = {
  ok: "text-validated bg-validated-soft",
  inferred: "text-inferred bg-inferred-soft",
  info: "text-violet bg-violet-soft",
  cold: "text-cold bg-cold-soft",
};

// Icon SVGs per material key (partial match against it.key).
function MaterialIcon({ materialKey }: { materialKey: string }) {
  const k = materialKey.toLowerCase();

  if (k.includes("deck") || k.includes("present") || k.includes("ppt")) {
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
        className="flex-shrink-0 text-violet"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    );
  }
  if (k.includes("email") || k.includes("mail")) {
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
        className="flex-shrink-0 text-violet"
      >
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    );
  }
  if (k.includes("brief") || k.includes("one-pager") || k.includes("caso")) {
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
        className="flex-shrink-0 text-violet"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    );
  }
  if (k.includes("propuesta") || k.includes("pricing") || k.includes("oferta")) {
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
        className="flex-shrink-0 text-violet"
      >
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  }
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
      className="flex-shrink-0 text-cold"
    >
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

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
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Spinner />
          <div>
            <div className="text-[13px] font-semibold text-ink">
              Generando materiales…
            </div>
            <div className="mt-0.5 text-[12px] text-cold">
              Personalizando para este deal
            </div>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-start gap-3 rounded-xl bg-risk-soft px-3.5 py-3.5 text-[12.5px] text-risk">
          <div>
            <div className="font-semibold">No se pudieron generar los materiales</div>
            <div className="mt-0.5 opacity-80">
              {error ?? "Revisá la conexión e intentá de nuevo."}
            </div>
          </div>
          {onRetry && (
            <Button small onClick={onRetry}>
              Reintentar
            </Button>
          )}
        </div>
      )}

      {status !== "loading" && status !== "error" && materials.length === 0 && (
        <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center">
          <div className="text-[13px] text-cold">
            Los materiales aparecerán acá en segundos.
          </div>
        </div>
      )}

      {materials.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => setActive(it)}
          className="group rounded-xl border border-line bg-panel p-3.5 text-left transition-all hover:border-violet/40 hover:shadow-[0_4px_16px_rgba(44,90,246,0.08)]"
        >
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-soft">
              <MaterialIcon materialKey={it.key} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <b className="text-[13.5px] leading-tight">{it.title}</b>
                <span
                  className={`mt-0.5 flex-shrink-0 whitespace-nowrap rounded-md px-[7px] py-0.5 text-[10px] font-bold ${tagCls[it.tag.tone]}`}
                >
                  {it.tag.label}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-cold">{it.sub}</div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-[12px] font-semibold text-violet group-hover:underline">
            Ver material
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
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
