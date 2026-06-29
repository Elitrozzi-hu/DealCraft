import type { ProvenanceStatus } from "@/types";

import { STATUS_META, StatusDot } from "./status-dot";

export interface ProvenanceLegendProps {
  className?: string;
}

const ORDER: ProvenanceStatus[] = ["validated", "inferred", "cold"];

/** A compact key for the three provenance states. Hover a term for its full
 *  meaning. Reuses `StatusDot` + `STATUS_META`, so it always matches the badges
 *  it explains. Presentational only. */
export function ProvenanceLegend({ className }: ProvenanceLegendProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3.5 gap-y-1.5${className ? ` ${className}` : ""}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-cold">
        Procedencia
      </span>
      {ORDER.map((s) => {
        const m = STATUS_META[s];
        return (
          <span
            key={s}
            title={m.desc}
            className={`inline-flex cursor-help items-center gap-1.5 ${m.text}`}
          >
            <StatusDot status={s} size={11} />
            <span className="text-[11px] font-semibold">{m.word}</span>
          </span>
        );
      })}
    </div>
  );
}
