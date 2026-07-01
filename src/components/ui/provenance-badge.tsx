import type { ReactNode } from "react";

import type { ProvenanceStatus } from "@/types";

import { useT } from "@/i18n";

import { SourceLinkIcon } from "./source-link-icon";
import { STATUS_META, STATUS_WORD_KEY, StatusDot } from "./status-dot";

export interface ProvenanceBadgeProps {
  source: string;
  sourceType: string;
  confidence: number;
  status: ProvenanceStatus;
  url?: string;
  compact?: boolean;
}

const iconProps = {
  width: 11,
  height: 11,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  className: "shrink-0",
} as const;

function LinkedInIcon() {
  return (
    <svg {...iconProps} fill="currentColor">
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.25 8h4.5v15H.25V8zm7.13 0h4.31v2.05h.06c.6-1.07 2.07-2.2 4.26-2.2 4.56 0 5.4 2.86 5.4 6.58V23h-4.5v-6.66c0-1.59-.03-3.63-2.21-3.63-2.21 0-2.55 1.73-2.55 3.51V23h-4.5V8z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19M12 2.5c2.7 2.6 2.7 16.4 0 19M12 2.5c-2.7 2.6-2.7 16.4 0 19" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <ellipse cx="12" cy="5" rx="8.5" ry="3.2" />
      <path d="M3.5 5v14c0 1.77 3.8 3.2 8.5 3.2s8.5-1.43 8.5-3.2V5" />
      <path d="M3.5 12c0 1.77 3.8 3.2 8.5 3.2s8.5-1.43 8.5-3.2" />
    </svg>
  );
}

function SourceIcon() {
  return (
    <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M6 2.5h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" />
      <path d="M13.5 2.5V8h5.5" />
    </svg>
  );
}


function pickIcon(source: string): ReactNode {
  const s = source.toLowerCase();
  if (s.includes("linkedin")) return <LinkedInIcon />;
  if (/(website|web|\.com|site|domain)/.test(s)) return <GlobeIcon />;
  if (/(dataset|hubspot|crm|histó|histo)/.test(s)) return <DatabaseIcon />;
  return <SourceIcon />;
}

/** Source · confidence badge (ports the PoC `Prov` atom). Shows a source icon,
 *  a status dot, and confidence; links to the real source when a `url` exists. */
export function ProvenanceBadge({
  source,
  sourceType,
  confidence,
  status,
  url,
  compact,
}: ProvenanceBadgeProps) {
  const t = useT();
  const m = STATUS_META[status];
  const pct = Math.round(confidence * 100);
  const title = `${t(STATUS_WORD_KEY[status])} · ${source} (${sourceType}) · ${t(
    "ui.provenanceBadge.confidence",
    { pct },
  )}${url ? ` · ${url}` : ""}`;
  const cls = `inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border px-[7px] py-[3px] text-[10.5px] font-semibold leading-none ${m.badge}`;

  const inner = (
    <>
      {pickIcon(source)}
      <StatusDot status={status} size={9} />
      {!compact && (
        <>
          {source}
          <span className="opacity-50">·</span>
        </>
      )}
      {pct}%
      {url && (
        <SourceLinkIcon className="ml-0.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />
      )}
    </>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        className={`${cls} group cursor-pointer transition-colors hover:underline`}
      >
        {inner}
      </a>
    );
  }

  return (
    <span title={title} className={cls}>
      {inner}
    </span>
  );
}
