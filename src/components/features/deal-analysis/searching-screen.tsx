import { useEffect, useRef, useState } from "react";
import type { DealSearchRequest } from "@/types";
import { Wordmark } from "@/components/ui";

export interface SearchingScreenProps {
  query: DealSearchRequest;
  steps: string[];
  step: number;
  /** Fired once the success beat finishes — caller advances to the analysis. */
  onComplete?: () => void;
}

function CheckIcon({ size = 11, width = 3.5 }: { size?: number; width?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 5 6v5c0 4.2 2.9 7.5 7 9 4.1-1.5 7-4.8 7-9V6l-7-3Z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SearchingScreen({ query, steps, step, onComplete }: SearchingScreenProps) {
  const complete = step >= steps.length;

  const [creep, setCreep] = useState(0.04);
  useEffect(() => {
    if (complete) return;
    const id = setInterval(() => {
      setCreep((p) => Math.min(p + (0.92 - p) * 0.07, 0.92));
    }, 160);
    return () => clearInterval(id);
  }, [complete]);
  const progress = complete ? 1 : creep;

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

  const doneCount = Math.min(step, steps.length);

  const fired = useRef(false);
  const handleSuccessEnd = () => {
    if (fired.current) return;
    fired.current = true;
    onComplete?.();
  };

  return (
    <div className="grid min-h-screen place-items-center bg-bg p-6">
      <div className="w-[460px] max-w-full">
        <div className="mb-8 flex justify-center">
          <Wordmark big />
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_1px_3px_rgba(15,27,61,0.07),0_8px_28px_rgba(15,27,61,0.06)]">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-surface">
            <div
              className={`h-full transition-[width] duration-500 ease-out ${complete ? "bg-validated" : "bg-violet"}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {complete ? (
            <div
              onAnimationEnd={handleSuccessEnd}
              className="animate-success-pop grid place-items-center px-7 py-10 text-center"
            >
              <div className="grid h-16 w-16 place-items-center rounded-full bg-validated-soft">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-validated text-white">
                  <CheckIcon size={20} width={3} />
                </div>
              </div>
              <div className="mt-5 text-[19px] font-extrabold tracking-tight text-ink">
                Análisis completo
              </div>
              <div className="mt-1.5 max-w-[34ch] text-[12.5px] leading-snug text-cold">
                {companyLabel} · {doneCount} campos verificados, cada uno con su
                fuente y nivel de confianza.
              </div>
            </div>
          ) : (
            <div className="p-7">
              <div className="mb-6">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-violet">
                  Analizando deal
                </div>
                <div className="mt-1 truncate text-[22px] font-extrabold leading-tight tracking-tight text-ink">
                  {companyLabel}
                </div>
              </div>

              <ol className="relative">
                {steps.map((s, i) => {
                  const done = i < step;
                  const active = i === step;
                  const isLast = i === steps.length - 1;
                  return (
                    <li key={s} className="relative flex gap-3.5 pb-4 last:pb-0">
                      {!isLast && (
                        <span
                          className="absolute left-[10.5px] top-[22px] bottom-0 w-[2px] overflow-hidden rounded-full bg-line"
                          aria-hidden
                        >
                          {done && <span className="absolute inset-0 bg-validated" />}
                          {active && (
                            <span className="absolute inset-x-0 h-1/2 animate-spine-flow rounded-full bg-violet" />
                          )}
                        </span>
                      )}

                      <span className="relative z-10 mt-px h-[22px] w-[22px] shrink-0">
                        {active && (
                          <span className="absolute inset-0 animate-ping rounded-full bg-violet/25" />
                        )}
                        <span
                          className={`relative grid h-[22px] w-[22px] place-items-center rounded-full text-white transition-colors ${
                            done
                              ? "bg-validated"
                              : active
                                ? "bg-violet ring-4 ring-violet-soft"
                                : "border-2 border-line bg-panel"
                          }`}
                        >
                          {done ? (
                            <CheckIcon />
                          ) : active ? (
                            <span className="h-[6px] w-[6px] rounded-full bg-white" />
                          ) : (
                            <span className="h-[5px] w-[5px] rounded-full bg-cold/30" />
                          )}
                        </span>
                      </span>

                      <div className="flex min-h-[22px] flex-1 items-center">
                        <span
                          className={`text-[13.5px] transition-colors ${
                            active
                              ? "font-semibold text-ink"
                              : done
                                ? "text-cold"
                                : "text-cold/45"
                          }`}
                        >
                          {s}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-6 flex items-center gap-2.5 rounded-xl bg-surface px-3.5 py-3">
                <span className="shrink-0 text-validated">
                  <ShieldIcon />
                </span>
                <p className="text-[11.5px] leading-snug text-cold">
                  Cada dato se guarda con su fuente y nivel de confianza. Nunca
                  inventamos.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
