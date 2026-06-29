import type { Pain, Score, Stakeholder } from "@/types";

export interface RisksBlockProps {
  stakeholders: Stakeholder[];
  pains: Pain[];
  scores: Score;
  coldStart: boolean;
  freshnessPenalty: number;
}

export function RisksBlock({
  stakeholders,
  pains,
  scores,
  coldStart,
  freshnessPenalty,
}: RisksBlockProps) {
  const risks: string[] = [];
  const ebOk = stakeholders.some(
    (s) =>
      (s.role === "Economic Buyer" || s.role === "Decision Maker") && s.validated,
  );
  if (!ebOk) risks.push("Economic buyer / decisor sin validar (riesgo de cierre).");
  const dom = pains.find((p) => p.id === scores.dominantId);
  if (dom && !dom.validated)
    risks.push("El dolor dominante todavía no está validado en call.");
  if (scores.coverage < 0.7)
    risks.push(
      `Cobertura de stakeholders baja (${Math.round(scores.coverage * 100)}%).`,
    );
  if (coldStart)
    risks.push("Cold start: la mayoría de la firmografía es inferida.");
  if (freshnessPenalty > 0)
    risks.push("Data envejecida: el score está degradado por frescura.");
  if (!risks.length)
    risks.push("Sin riesgos críticos detectados con la data actual.");

  return (
    <div className="grid gap-2">
      {risks.map((r) => (
        <div
          key={r}
          className="flex gap-2.5 rounded-lg bg-risk-soft px-3 py-2.5 text-[12.5px] text-ink"
        >
          <span className="text-risk">▲</span> {r}
        </div>
      ))}
    </div>
  );
}
