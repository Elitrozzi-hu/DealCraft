"use client";

import { useId, useState, type ReactNode } from "react";

export interface AccordionProps {
  title: string;
  icon?: ReactNode;
  count?: number;
  right?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Accordion({
  title,
  icon,
  count,
  right,
  defaultOpen,
  children,
}: AccordionProps) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const panelId = useId();
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_1px_2px_rgba(28,24,48,0.04)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left"
      >
        {icon && <span className="text-sm">{icon}</span>}
        <span className="text-[11.5px] font-extrabold uppercase tracking-wide text-ink">
          {title}
        </span>
        {count != null && <span className="text-[11px] text-cold">({count})</span>}
        <span className="ml-auto flex items-center gap-2.5">
          {right}
          <span
            aria-hidden
            className={`text-[13px] text-cold transition-transform ${open ? "rotate-90" : ""}`}
          >
            ›
          </span>
        </span>
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
