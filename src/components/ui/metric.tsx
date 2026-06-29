import type { ReactNode } from "react";

export interface MetricProps {
  label: string;
  children: ReactNode;
  /** Optional provenance badge rendered under the value. */
  prov?: ReactNode;
  /** Drop the right divider (last metric in a row). */
  last?: boolean;
}

export function Metric({ label, children, prov, last }: MetricProps) {
  return (
    <div
      className={`flex min-w-[88px] flex-shrink-0 flex-col justify-center px-4 ${last ? "" : "border-r border-line"}`}
    >
      <div className="flex items-baseline gap-1.5">{children}</div>
      <div className="mt-[3px] text-[10px] font-bold uppercase tracking-wide text-cold">
        {label}
      </div>
      {prov && <div className="mt-[5px]">{prov}</div>}
    </div>
  );
}
