export interface SpinnerProps {
  size?: "sm" | "md";
  /** Accessible label announced to screen readers. */
  label?: string;
}

const sizeCls = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-[3px]",
} as const;

/** CSS-only loading indicator (no state — server-renderable). */
export function Spinner({ size = "sm", label = "Cargando…" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-cold-soft border-t-violet ${sizeCls[size]}`}
    />
  );
}
