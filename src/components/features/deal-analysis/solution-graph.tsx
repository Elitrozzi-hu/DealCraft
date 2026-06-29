import { useState } from "react";
import type { Pain, PainDraft } from "@/types";
import { TAXONOMIES, resolveModule } from "@/lib/constants";
import { Button, EmptyState, Input, LinkAnchor, SourceLinkIcon } from "@/components/ui";

export interface SolutionGraphProps {
  pains: Pain[];
  dominantId: string | null;
  onValidate: (id: string) => void;
  onAdd: (draft: PainDraft) => void;
  onRemove: (id: string) => void;
}

const selectCls =
  "rounded-lg border border-line bg-panel px-2.5 py-[7px] text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-violet/50";

const emptyDraft: PainDraft = { label: "", taxonomy: TAXONOMIES[0], evidence: "" };

// Section glyph for the empty state — a pain/signal spark.
function PainGlyph() {
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
      <path d="M12 2 3 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

export function SolutionGraph({
  pains,
  dominantId,
  onValidate,
  onAdd,
  onRemove,
}: SolutionGraphProps) {
  const [adding, setAdding] = useState(false);
  const [d, setD] = useState<PainDraft>(emptyDraft);
  const preview = resolveModule(d.taxonomy);

  const save = () => {
    if (!d.label.trim() || !preview) return;
    onAdd(d);
    setAdding(false);
    setD(emptyDraft);
  };

  if (pains.length === 0 && !adding) {
    return (
      <EmptyState
        icon={<PainGlyph />}
        title="Sin dolores mapeados"
        hint="Todavía no identificamos puntos de dolor para recorrer el solution graph. Agregá uno y lo mapeamos a un módulo de Humand."
        action={
          <Button small onClick={() => setAdding(true)}>
            ＋ agregar dolor
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-2.5 flex justify-end">
        {!adding && (
          <Button small onClick={() => setAdding(true)}>
            ＋ agregar
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {pains.map((p) => {
          const isDom = p.id === dominantId;
          return (
            <div
              key={p.id}
              className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center"
            >
              {/* pain */}
              <div
                className={`flex-1 rounded-xl border px-3 py-2.5 ${isDom ? "border-violet bg-violet-soft ring-[3px] ring-violet/15" : "border-line bg-panel"}`}
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  {isDom && (
                    <span className="rounded bg-violet px-1.5 py-px text-[9px] font-extrabold text-white">
                      ★ DOMINANTE
                    </span>
                  )}
                  <span className="rounded border border-line px-1.5 py-px text-[10px] text-cold">
                    {p.taxonomy}
                  </span>
                </div>
                <div className="text-[13px] font-bold">{p.label}</div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`text-[10.5px] font-semibold ${p.validated ? "text-validated" : "text-inferred"}`}
                    >
                      {p.validated
                        ? "✓ validado"
                        : `inferido ${Math.round(p.conf * 100)}%`}
                    </span>
                    {p.evidence && (
                      <span className="text-[10px] text-cold">{p.evidence}</span>
                    )}
                    {p.sourceUrl && (
                      <LinkAnchor
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir fuente"
                        aria-label="Abrir fuente"
                        tone="cold"
                      >
                        <SourceLinkIcon className="shrink-0" />
                      </LinkAnchor>
                    )}
                  </span>
                  <div className="flex gap-1.5">
                    {!p.validated && (
                      <Button small onClick={() => onValidate(p.id)}>
                        validar
                      </Button>
                    )}
                    <Button small onClick={() => onRemove(p.id)}>
                      ✕
                    </Button>
                  </div>
                </div>
              </div>

              {/* module (only when the pain maps to one; Classidy pains don't) */}
              {p.module && (
                <>
                  {/* connector */}
                  <div
                    className={`self-center text-base ${isDom ? "text-violet" : "text-cold"}`}
                    aria-hidden
                  >
                    <span className="sm:hidden">↓</span>
                    <span className="hidden sm:inline">→</span>
                  </div>

                  <div className="flex flex-1 items-center rounded-xl border border-line border-l-[3px] border-l-violet bg-panel px-3 py-2.5">
                    <div className="text-[12.5px] font-bold leading-tight text-violet">
                      {p.module}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {adding && (
        <div className="mt-3 rounded-xl bg-violet-soft p-3">
          <div className="flex flex-wrap gap-2">
            <Input
              id="pain-label"
              compact
              className="flex-[1_1_200px]"
              placeholder="Punto de dolor"
              value={d.label}
              onChange={(e) => setD({ ...d, label: e.target.value })}
            />
            <select
              aria-label="Taxonomía"
              className={selectCls}
              value={d.taxonomy}
              onChange={(e) => setD({ ...d, taxonomy: e.target.value })}
            >
              {TAXONOMIES.map((t) => (
                <option key={t}>{t}</option>
              ))}
              <option value="Otro (no mapeado)">Otro (no mapeado)</option>
            </select>
          </div>
          <Input
            id="pain-evidence"
            compact
            className="mt-2"
            placeholder="Evidencia (opcional)"
            value={d.evidence}
            onChange={(e) => setD({ ...d, evidence: e.target.value })}
          />
          <div className="mt-2 text-xs">
            {preview ? (
              <span>
                <span className="text-cold">solution graph → </span>
                <b className="text-violet">{preview}</b>
              </span>
            ) : (
              <span className="font-semibold text-risk">
                ⚠ sin módulo en el catálogo — el graph lo rechaza
              </span>
            )}
          </div>
          <div className="mt-2.5 flex gap-2">
            <Button small primary disabled={!preview || !d.label.trim()} onClick={save}>
              Agregar
            </Button>
            <Button small onClick={() => setAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
