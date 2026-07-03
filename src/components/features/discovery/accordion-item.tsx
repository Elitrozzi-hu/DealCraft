import { useState, type ReactNode } from "react";

export interface AccordionItemProps {
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Self-contained expand/collapse row — each instance manages its own open state. */
export function AccordionItem({
  title,
  defaultOpen = false,
  children,
}: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-line py-2.5 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-2.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50"
      >
        <div className="text-[12.8px] font-semibold text-ink">{title}</div>
        <span
          className={`mt-0.5 shrink-0 text-cold transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}
