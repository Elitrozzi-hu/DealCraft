export interface ProgressBarProps {
  /** Fraction 0..1. */
  value: number;
  /** Tailwind bg utility for the fill, e.g. "bg-violet". */
  fillClass?: string;
  /** Tailwind height utility for the track, e.g. "h-1.5". */
  heightClass?: string;
}

/**
 * Horizontal progress/score bar. The fill width is genuinely dynamic and has no
 * Tailwind equivalent, so it is applied via a prebuilt style object passed to
 * the `style` prop (not an inline object literal) — the documented numeric
 * exception. Centralized here so it is the only such site.
 */
export function ProgressBar({
  value,
  fillClass = "bg-violet",
  heightClass = "h-1.5",
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value * 100));
  const fill = { width: `${pct}%` };
  return (
    <div className={`overflow-hidden rounded-full bg-cold-soft ${heightClass}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${fillClass}`}
        style={fill}
      />
    </div>
  );
}
