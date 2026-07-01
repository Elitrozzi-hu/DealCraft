import type { ReactNode } from "react";

import { StatusDot } from "./status-dot";

export interface EmptyStateProps {
  /** Headline — what's missing, in plain terms (e.g. "Sin stakeholders todavía"). */
  title: string;
  /** One line on why it's empty and what to do next. */
  hint?: string;
  /** Section glyph shown inside the cold ring; defaults to the empty-moon dot. */
  icon?: ReactNode;
  /** Optional call to action (e.g. an "agregar" button). */
  action?: ReactNode;
}

/** A "no results" panel. Borrows the `cold` provenance language — dashed slate
 *  border, soft fill, empty-moon glyph — so an absent section reads as a
 *  deliberate cold-start signal rather than a blank. Presentational only. */
export function EmptyState({ title, hint, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-cold/30 bg-cold-soft/40 px-4 py-7 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-panel text-cold ring-1 ring-cold/15">
        {icon ?? <StatusDot status="cold" size={16} />}
      </div>
      <div className="text-[13px] font-bold text-ink">{title}</div>
      {hint && (
        <p className="m-0 max-w-[36ch] text-[11.5px] leading-relaxed text-cold">
          {hint}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
