"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";

export interface OverlayProps {
  title: string;
  onClose: () => void;
  /** Wider panel for richer content (e.g. material previews). */
  wide?: boolean;
  children: ReactNode;
}

/** Right-side drawer. Closes on backdrop click and ESC; traps focus and
 *  restores it to the trigger on unmount. */
export function Overlay({ title, onClose, wide, children }: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Keep the latest onClose without making it an effect dependency, so the
  // focus trap mounts once and never re-runs (which would steal focus on every
  // re-render of the parent, e.g. while typing in a child input).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    panel?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus?.();
    };
  }, []);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-ink/40"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`h-full max-w-[92vw] overflow-y-auto bg-panel p-6 shadow-[-8px_0_30px_rgba(0,0,0,0.12)] focus:outline-none ${wide ? "w-[560px]" : "w-[460px]"}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div id={titleId} className="text-base font-extrabold">
            {title}
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-cold-soft text-base"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
