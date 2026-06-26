import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  children: ReactNode;
  /** Solid brand-violet call-to-action. */
  primary?: boolean;
  /** Compact size. */
  small?: boolean;
  /** Affirmative ("validated") styling. */
  tone?: "ok";
}

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet/50 disabled:cursor-not-allowed disabled:opacity-70";

const variant = {
  primary:
    "border border-violet bg-violet text-white hover:bg-[#1f49e5] hover:border-[#1f49e5] disabled:border-line disabled:bg-[#eee] disabled:text-[#999]",
  ok: "border border-validated/40 bg-validated-soft text-validated hover:bg-validated/10 disabled:bg-[#eee] disabled:text-[#999]",
  default:
    "border border-line bg-panel text-ink hover:bg-cold-soft hover:border-cold/30 disabled:bg-[#eee] disabled:text-[#999]",
} as const;

export function Button({ children, primary, small, tone, ...rest }: ButtonProps) {
  const kind = primary ? "primary" : tone === "ok" ? "ok" : "default";
  const size = small ? "px-3 py-[5px] text-xs" : "px-4 py-2 text-[13px]";
  return (
    <button {...rest} className={`${base} ${size} ${variant[kind]}`}>
      {children}
    </button>
  );
}
