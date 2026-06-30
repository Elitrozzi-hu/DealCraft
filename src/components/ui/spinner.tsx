import { useT } from "@/i18n";

export interface SpinnerProps {
  size?: "sm" | "md";
  label?: string;
}

const sizeCls = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-[3px]",
} as const;

export function Spinner({ size = "sm", label }: SpinnerProps) {
  const t = useT();
  return (
    <span
      role="status"
      aria-label={label ?? t("ui.spinner.loading")}
      className={`inline-block animate-spin rounded-full border-cold-soft border-t-violet ${sizeCls[size]}`}
    />
  );
}
