import type { ReactNode } from "react";

export type ChipTone = "cold" | "violet" | "validated" | "inferred" | "risk";

export interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
}

const toneCls: Record<ChipTone, string> = {
  cold: "text-cold border-cold/20 bg-cold-soft",
  violet: "text-violet border-violet/20 bg-violet-soft",
  validated: "text-validated border-validated/20 bg-validated-soft",
  inferred: "text-inferred border-inferred/20 bg-inferred-soft",
  risk: "text-risk border-risk/20 bg-risk-soft",
};

/** Small bordered label (ports the PoC inline `chip` helper). */
export function Chip({ children, tone = "cold" }: ChipProps) {
  return (
    <span
      className={`whitespace-nowrap rounded-md border px-[7px] py-px text-[10.5px] ${toneCls[tone]}`}
    >
      {children}
    </span>
  );
}
