import type { SuccessCase, HubSpotSuccessCase } from "@/types";
import { MOCK_SUCCESS_CASES, MOCK_COMP_REFERENCE } from "@/lib/fixtures";
import { ProvenanceBadge } from "@/components/ui";

const similarity = (c: SuccessCase): number => {
  const ind = 1;
  const dk = 1 - Math.min(1, Math.abs(c.deskless - MOCK_COMP_REFERENCE.deskless) / 40);
  const sz = 1 - Math.min(1, Math.abs(c.size - MOCK_COMP_REFERENCE.size) / 400);
  return Math.round((ind * 0.5 + dk * 0.3 + sz * 0.2) * 100);
};

export interface CompsBlockProps {
  successCases?: SuccessCase[];
  /** When provided, renders real HubSpot data instead of the mock path. */
  hubspotSuccessCases?: HubSpotSuccessCase[];
}

export function CompsBlock({
  successCases = MOCK_SUCCESS_CASES,
  hubspotSuccessCases,
}: CompsBlockProps) {
  // Real HubSpot data path
  if (hubspotSuccessCases !== undefined) {
    if (hubspotSuccessCases.length === 0) {
      return (
        <div className="py-4 text-center text-[13px] text-cold">
          No hay casos de éxito en HubSpot para este segmento e industria
        </div>
      );
    }

    return (
      <div>
        <div className="mb-2 flex justify-between">
          <span className="text-[11.5px] text-cold">
            Deals ganados y Red List · misma industria y segmento
          </span>
          <ProvenanceBadge
            source="HubSpot"
            sourceType="declarado"
            confidence={1}
            status="validated"
          />
        </div>
        {hubspotSuccessCases.map((c) => {
          const isWon = c.stageLabel?.toLowerCase().includes("won") ||
            c.stageLabel?.toLowerCase().includes("ganado");
          return (
            <div key={c.id} className="border-t border-line py-2.5">
              <div className="flex items-center justify-between gap-2">
                <b className="min-w-0 truncate text-[13px]">{c.name}</b>
                <span
                  className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[10.5px] font-extrabold ${isWon ? "bg-validated-soft text-validated" : "bg-risk-soft text-risk"}`}
                >
                  {c.stageLabel ?? "—"}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-cold">
                {[c.industry, c.segment, c.amount != null ? `USD ${c.amount}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Mock fallback path (used when hubspotSuccessCases is not provided)
  const ranked = successCases
    .map((c) => ({ ...c, s: similarity(c) }))
    .sort((a, b) => b.s - a.s);
  const wins = ranked.filter((c) => c.result === "won");
  const winRate = Math.round((wins.length / ranked.length) * 100);
  const avgCycle = wins.length
    ? Math.round(wins.reduce((a, c) => a + c.cycle, 0) / wins.length)
    : 0;

  const stats: [string, string, string][] = [
    ["win rate", `${winRate}%`, "text-validated"],
    ["ciclo medio", `${avgCycle}d`, "text-ink"],
    ["wedge típico", "Comunicación", "text-violet"],
  ];

  return (
    <div>
      <div className="mb-2 flex justify-between">
        <span className="text-[11.5px] text-cold">
          incluye pérdidas · sin sesgo de supervivencia
        </span>
        <ProvenanceBadge
          source="Dataset histórico"
          sourceType="curado"
          confidence={0.92}
          status="validated"
        />
      </div>
      <div className="mb-2.5 flex flex-wrap gap-2">
        {stats.map(([k, v, color]) => (
          <div key={k} className="rounded-lg border border-line px-3 py-2">
            <div className={`text-[15px] font-extrabold ${color}`}>{v}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-cold">
              {k}
            </div>
          </div>
        ))}
      </div>
      {ranked.map((c) => {
        const won = c.result === "won";
        return (
          <div key={c.co} className="border-t border-line py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <b className="w-[30px] text-[11px] text-violet">{c.s}%</b>
                <b className="text-[13px]">{c.co}</b>
              </span>
              <span
                className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[10.5px] font-extrabold ${won ? "bg-validated-soft text-validated" : "bg-risk-soft text-risk"}`}
              >
                {won ? `✓ USD ${c.mrr}` : "✕ perdido"}
              </span>
            </div>
            <div className="ml-[37px] mt-0.5 text-[11px] text-cold">
              {c.industry} · {c.deskless}% deskless · wedge {c.wedge} · {c.cycle}d
              {c.reason ? ` · ${c.reason}` : ""}
            </div>
          </div>
        );
      })}
      <div className="mt-2.5 rounded-lg border border-risk/30 bg-risk-soft p-2.5 text-xs">
        <b className="text-risk">Las pérdidas enseñan:</b> cayeron por precio y por
        falta de champion económico — tu gap actual es el CFO. Involucralo antes
        del pricing.
      </div>
    </div>
  );
}
