import { useState } from "react";
import type { Pain, PainDraft } from "@/types";
import { TAXONOMIES, UNMAPPED_TAXONOMY } from "@/lib/constants";
import { Button, EmptyState, Input, LinkAnchor, SourceLinkIcon } from "@/components/ui";

export interface PainsBlockProps {
  pains: Pain[];
  onValidate: (id: string) => void;
  onAdd: (draft: PainDraft) => void;
  onRemove: (id: string) => void;
}

const selectCls =
  "rounded-lg border border-line bg-panel px-2.5 py-[7px] text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-violet/50";

const emptyDraft: PainDraft = { label: "", taxonomy: TAXONOMIES[0], evidence: "" };

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

export function PainsBlock({ pains, onValidate, onAdd, onRemove }: PainsBlockProps) {
  const [adding, setAdding] = useState(false);
  const [d, setD] = useState<PainDraft>(emptyDraft);

  const save = () => {
    if (!d.label.trim()) return;
    onAdd(d);
    setAdding(false);
    setD(emptyDraft);
  };

  if (pains.length === 0 && !adding) {
    return (
      <EmptyState
        icon={<PainGlyph />}
        title="Sin dolores identificados"
        hint="No encontramos puntos de dolor para este deal. Podés agregar uno a mano."
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
      <div className="mb-2 flex justify-end">
        {!adding && (
          <Button small onClick={() => setAdding(true)}>
            ＋ agregar
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {pains.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-line border-l-[3px] border-l-inferred bg-panel px-3 py-2.5"
          >
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              {p.taxonomy !== UNMAPPED_TAXONOMY && (
                <span className="rounded border border-line px-1.5 py-px text-[10px] text-cold">
                  {p.taxonomy}
                </span>
              )}
              {p.validated && (
                <span className="rounded border border-validated/30 bg-validated-soft px-1.5 py-px text-[10px] font-bold text-validated">
                  ✓ validado
                </span>
              )}
            </div>

            <p className="text-[13px] font-bold leading-snug text-ink">{p.label}</p>

            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                {!p.validated && (
                  <span className="text-[10.5px] font-semibold text-inferred">
                    inferido {Math.round(p.conf * 100)}%
                  </span>
                )}
                {p.evidence && (
                  <span className="truncate text-[10px] text-cold">{p.evidence}</span>
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
              <div className="flex shrink-0 gap-1.5">
                {!p.validated && (
                  <Button small tone="ok" onClick={() => onValidate(p.id)}>
                    validar
                  </Button>
                )}
                <Button small onClick={() => onRemove(p.id)}>
                  ✕
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {adding && (
        <div className="mt-2 rounded-xl bg-violet-soft p-3">
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
              aria-label="Categoría"
              className={selectCls}
              value={d.taxonomy}
              onChange={(e) => setD({ ...d, taxonomy: e.target.value })}
            >
              {TAXONOMIES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <Input
              id="pain-evidence"
              compact
              className="flex-[1_1_200px]"
              placeholder="Evidencia (opcional)"
              value={d.evidence}
              onChange={(e) => setD({ ...d, evidence: e.target.value })}
            />
          </div>
          <div className="mt-2 flex gap-2">
            <Button small primary onClick={save}>
              Guardar
            </Button>
            <Button small onClick={() => { setAdding(false); setD(emptyDraft); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
