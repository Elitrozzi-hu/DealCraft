import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type LinkButtonTone = "violet" | "cold";

const baseCls =
  "inline-flex items-center gap-1 text-[12px] font-semibold transition-colors hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-violet/40 disabled:cursor-not-allowed disabled:opacity-50";

const toneCls: Record<LinkButtonTone, string> = {
  violet: "text-violet hover:text-[#1f49e5]",
  cold: "text-cold hover:text-violet",
};

/** Inline text link — use as a <button> */
export function LinkButton({
  children,
  tone = "violet",
  ...rest
}: { children: ReactNode; tone?: LinkButtonTone } & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
>) {
  return (
    <button type="button" {...rest} className={`${baseCls} ${toneCls[tone]}`}>
      {children}
    </button>
  );
}

/** Inline text link — use as an <a> */
export function LinkAnchor({
  children,
  tone = "violet",
  ...rest
}: { children: ReactNode; tone?: LinkButtonTone } & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "className"
>) {
  return (
    <a {...rest} className={`${baseCls} ${toneCls[tone]}`}>
      {children}
    </a>
  );
}
