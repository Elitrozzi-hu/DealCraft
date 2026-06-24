import type { ReactNode } from "react";

export type ChipTone = "cold" | "violet" | "validated" | "inferred" | "risk";

export interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
}

const toneCls: Record<ChipTone, string> = {
  cold: "text-cold border-cold/30",
  violet: "text-violet border-violet/30",
  validated: "text-validated border-validated/30",
  inferred: "text-inferred border-inferred/30",
  risk: "text-risk border-risk/30",
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
