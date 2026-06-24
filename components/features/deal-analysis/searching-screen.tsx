import type { DealSearchRequest } from "@/types";
import { Card, ProgressBar, Wordmark } from "@/components/ui";

export interface SearchingScreenProps {
  query: DealSearchRequest;
  steps: string[];
  /** Index of the active step. */
  step: number;
}

export function SearchingScreen({ query, steps, step }: SearchingScreenProps) {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-[520px] max-w-full">
        <div className="mb-[22px] grid place-items-center">
          <Wordmark big />
        </div>
        <Card
          title="Buscando…"
          sub={`${query.name}${query.website ? " · " + query.website : ""}`}
          accent="violet"
        >
          <div className="my-1.5 mb-4">
            <ProgressBar value={step / steps.length} />
          </div>
          {steps.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div
                key={s}
                className={`flex items-center gap-2.5 py-[7px] ${i <= step ? "opacity-100" : "opacity-40"}`}
              >
                <span
                  className={`grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-full text-[11px] text-white ${done ? "bg-validated" : active ? "bg-violet" : "bg-cold-soft"}`}
                >
                  {done ? "✓" : active ? "•" : ""}
                </span>
                <span
                  className={`text-[13px] ${done ? "text-ink" : active ? "font-semibold text-violet" : "text-cold"}`}
                >
                  {s}
                </span>
              </div>
            );
          })}
          <div className="mt-3 text-[11.5px] text-cold">
            Cada campo se guarda con fuente · confianza. No se fabrica nada.
          </div>
        </Card>
      </div>
    </div>
  );
}
