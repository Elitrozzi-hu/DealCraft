import type { DealSearchRequest } from "@/types";
import { ProgressBar, Wordmark } from "@/components/ui";

export interface SearchingScreenProps {
  query: DealSearchRequest;
  steps: string[];
  step: number;
}

export function SearchingScreen({ query, steps, step }: SearchingScreenProps) {
  // Prefer the specific deal name, then company, then the general name field
  // (which is set to companyName || fullName || email in selectCandidate).
  // Avoid showing a raw email address as the headline.
  const rawLabel =
    query.deal?.name ??
    query.companyName ??
    (query.name && !query.name.includes("@") ? query.name : undefined) ??
    query.website ??
    "…";
  const companyLabel = rawLabel ?? "…";

  return (
    <div className="grid min-h-screen place-items-center bg-bg p-6">
      <div className="w-[520px] max-w-full">
        {/* Wordmark */}
        <div className="mb-8 flex justify-center">
          <Wordmark big />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-[0_1px_3px_rgba(15,27,61,0.07),0_4px_16px_rgba(15,27,61,0.05)]">
          {/* Company + headline */}
          <div className="mb-5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-cold">
              Analizando
            </div>
            <div className="mt-0.5 text-[20px] font-extrabold tracking-tight">
              {companyLabel}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <ProgressBar value={step / Math.max(steps.length, 1)} />
          </div>

          {/* Steps */}
          <div className="grid gap-0.5">
            {steps.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div
                  key={s}
                  className={`flex items-center gap-3 rounded-lg px-2 py-2 transition-colors ${active ? "bg-violet-soft" : ""} ${i <= step ? "opacity-100" : "opacity-35"}`}
                >
                  <span
                    className={`grid h-[20px] w-[20px] flex-shrink-0 place-items-center rounded-full text-[11px] font-bold text-white transition-colors ${done ? "bg-validated" : active ? "bg-violet" : "bg-cold-soft"}`}
                  >
                    {done ? (
                      <svg
                        width={10}
                        height={10}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : active ? (
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    ) : (
                      ""
                    )}
                  </span>
                  <span
                    className={`text-[13px] ${done ? "text-ink" : active ? "font-semibold text-violet" : "text-cold"}`}
                  >
                    {s}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="mt-5 border-t border-line pt-4 text-[11.5px] text-cold">
            Cada campo se guarda con fuente y confianza. No se fabrica nada.
          </div>
        </div>
      </div>
    </div>
  );
}
