import type { ReactNode } from "react";

export type CardAccent = "violet" | "validated" | "inferred" | "risk" | "cold";
export type CardPad = "sm" | "md" | "lg";

export interface CardProps {
  title?: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  accent?: CardAccent;
  pad?: CardPad;
  children?: ReactNode;
}

const padCls: Record<CardPad, string> = {
  sm: "p-3.5",
  md: "p-4",
  lg: "p-[18px]",
};

const accentCls: Record<CardAccent, string> = {
  violet: "border-t-[3px] border-t-violet",
  validated: "border-t-[3px] border-t-validated",
  inferred: "border-t-[3px] border-t-inferred",
  risk: "border-t-[3px] border-t-risk",
  cold: "border-t-[3px] border-t-cold",
};

export function Card({ title, sub, right, accent, pad = "lg", children }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-line bg-panel shadow-[0_1px_3px_rgba(15,27,61,0.07),0_4px_16px_rgba(15,27,61,0.05)] ${padCls[pad]} ${accent ? accentCls[accent] : ""}`}
    >
      {(title || right) && (
        <div
          className={`flex items-start justify-between gap-2.5 ${title ? "mb-3" : ""}`}
        >
          <div>
            {title && (
              <div className="text-[15px] font-bold text-ink">{title}</div>
            )}
            {sub && <div className="mt-0.5 text-[12.5px] text-cold">{sub}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
