import type { DealMeta } from "@/types";
import { Metric } from "@/components/ui";

export interface DealHeaderProps {
  meta: DealMeta;
  /** Resolved HubSpot deal-stage label (never the numeric id); "" → "—". */
  dealStage: string;
  /** HubSpot deal amount; null → "—". */
  amount: number | null;
  /** Back to the input screen to start a new analysis. */
  onBack: () => void;
}

const initials = (n: string): string =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const segmentBorder: Record<string, string> = {
  Enterprise: "border-[3px] border-violet/40",
  "Mid-Market": "border-[3px] border-inferred/40",
  SMB: "border-[3px] border-cold/30",
};

export function DealHeader({
  meta,
  dealStage,
  amount,
  onBack,
}: DealHeaderProps) {
  const avatarBorder =
    segmentBorder[meta.segment] ?? "border-[3px] border-cold/20";

  return (
    <div className="border-b border-line bg-panel shadow-[0_1px_4px_rgba(15,27,61,0.06)]">
      <div className="mx-auto flex w-full max-w-[1760px] flex-col flex-wrap items-stretch justify-between gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:gap-[18px] lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver al inicio"
            title="Nuevo análisis"
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-line bg-panel text-cold transition-colors hover:border-violet/40 hover:bg-violet-soft hover:text-violet focus:outline-none focus-visible:ring-2 focus-visible:ring-violet/50"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div
            className={`grid h-[50px] w-[50px] flex-shrink-0 place-items-center rounded-xl bg-violet-soft text-[15px] font-extrabold text-violet ${avatarBorder}`}
          >
            {initials(meta.name)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[17px] font-extrabold tracking-tight">
                {meta.name}
              </span>
              <span className="rounded-md bg-violet-soft px-2 py-0.5 text-[11px] font-bold text-violet">
                {meta.segment}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-cold">
              <span>{meta.industry}</span>
              <span className="text-line">·</span>
              <span>{meta.region}</span>
              {meta.website && (
                <>
                  <span className="text-line">·</span>
                  <span>{meta.website}</span>
                </>
              )}
              <span className="text-line">·</span>
              <span>{meta.headcount.toLocaleString("en-US")} emp.</span>
            </div>
          </div>
        </div>

        <div className="flex items-stretch overflow-x-auto md:flex-wrap md:overflow-x-visible">
          <Metric label="Etapa HubSpot">
            <span className="text-[16px] font-extrabold">
              {dealStage || "—"}
            </span>
          </Metric>
          <Metric label="Monto" last>
            <span className="text-[16px] font-extrabold">
              {amount != null ? `USD ${amount.toLocaleString("en-US")}` : "—"}
            </span>
          </Metric>
        </div>
      </div>
    </div>
  );
}
