import type { ProvenanceStatus } from "@/types";
import type { MessageKey } from "@/i18n";



export const STATUS_META: Record<
  ProvenanceStatus,
  { text: string; soft: string; badge: string }
> = {
  validated: {
    text: "text-validated",
    soft: "bg-validated-soft",
    badge: "bg-validated-soft text-validated border-validated/20",
  },
  inferred: {
    text: "text-inferred",
    soft: "bg-inferred-soft",
    badge: "bg-inferred-soft text-inferred border-inferred/20",
  },
  cold: {
    text: "text-cold",
    soft: "bg-cold-soft",
    badge: "bg-cold-soft text-cold border-cold/20",
  },
};

export const STATUS_WORD_KEY: Record<ProvenanceStatus, MessageKey> = {
  validated: "ui.status.validated.word",
  inferred: "ui.status.inferred.word",
  cold: "ui.status.cold.word",
};
export const STATUS_DESC_KEY: Record<ProvenanceStatus, MessageKey> = {
  validated: "ui.status.validated.desc",
  inferred: "ui.status.inferred.desc",
  cold: "ui.status.cold.desc",
};

export interface StatusDotProps {
  status: ProvenanceStatus;
  size?: number;
  className?: string;
}

export function StatusDot({ status, size = 10, className }: StatusDotProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    className: `shrink-0${className ? ` ${className}` : ""}`,
  } as const;

  if (status === "validated") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="11" fill="currentColor" />
      </svg>
    );
  }

  if (status === "inferred") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M12 3.5 A8.5 8.5 0 0 1 12 20.5 Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
