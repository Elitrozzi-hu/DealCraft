import type { InputHTMLAttributes, ReactNode } from "react";

export interface LabelProps {
  htmlFor: string;
  children: ReactNode;
}

export function Label({ htmlFor, children }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-cold"
    >
      {children}
    </label>
  );
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Required so it can be paired with a `<Label htmlFor>`. */
  id: string;
  /** Compact variant used inside inline forms. */
  compact?: boolean;
}

export function Input({ id, compact, className, ...rest }: InputProps) {
  const size = compact ? "px-2.5 py-[7px] text-[13px]" : "px-3 py-2.5 text-sm";
  return (
    <input
      id={id}
      {...rest}
      className={`w-full rounded-lg border border-line bg-panel text-ink outline-none focus-visible:ring-2 focus-visible:ring-violet/50 ${size} ${className ?? ""}`}
    />
  );
}
