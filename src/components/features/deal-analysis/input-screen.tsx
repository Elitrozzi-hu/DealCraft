import { memo, useCallback, useRef, useState } from "react";
import type {
  DealSearchRequest,
  LeadCandidate,
  LeadDeal,
  RecentDeal,
} from "@/types";
import {
  Card,
  Chip,
  Empty,
  Spinner,
  Wordmark,
} from "@/components/ui";
import { useLeadSearch } from "@/hooks/use-lead-search";
import { STAGES, stageIndex, stageObj } from "@/lib/constants";
import {
  MOCK_INITIAL_QUERY,
  MOCK_RECENT_DEALS,
  MOCK_SEARCH_EXAMPLES,
} from "@/lib/fixtures";
import { scoreTextClass } from "./score";

export interface InputScreenProps {
  onSearch: (query: DealSearchRequest) => void;
  onOpenHistory: (deal: RecentDeal) => void;
  initialQuery?: DealSearchRequest;
}

function formatAmount(amount: number | null): string {
  return amount != null ? `USD ${amount.toLocaleString("en-US")}` : "—";
}

const initials = (n: string): string =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

interface CandidateCardProps {
  candidate: LeadCandidate;
  onPick: (candidate: LeadCandidate, deal?: LeadDeal) => void;
}

const CandidateCard = memo(function CandidateCard({
  candidate: c,
  onPick,
}: CandidateCardProps) {
  const single = c.deals.length === 1;
  const multiple = c.deals.length > 1;

  const context = (
    <>
      <div className="flex items-start justify-between gap-2.5">
        <div className="text-[14px] font-bold leading-tight">
          {c.fullName ?? c.jobTitle ?? c.contactEmail ?? "Contacto"}
        </div>
        {c.lifecycleStage && <Chip tone="violet">{c.lifecycleStage}</Chip>}
      </div>
      <div className="text-[12.5px] text-cold">
        {c.companyName ?? "—"}
        {c.companyDomain ? ` · ${c.companyDomain}` : ""}
      </div>
      <div className="text-[12px] text-cold">
        {[c.jobTitle, c.contactEmail].filter(Boolean).join(" · ") ||
          "Sin contacto"}
      </div>
      {(c.country || c.state || c.region) && (
        <div className="text-[11px] text-cold">
          {[c.country, c.state ?? c.region].filter(Boolean).join(" · ")}
        </div>
      )}
    </>
  );

  if (!multiple) {
    const deal = single ? c.deals[0] : undefined;
    return (
      <button
        type="button"
        onClick={() => onPick(c, deal)}
        className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3.5 text-left transition-all hover:border-violet/50 hover:shadow-[0_4px_16px_rgba(44,90,246,0.10)]"
      >
        {context}
        {single ? (
          <div className="rounded-xl border border-line bg-surface px-2.5 py-2 text-[12px]">
            <div className="font-semibold">
              {c.deals[0].name ?? "Deal sin nombre"}
            </div>
            <div className="mt-0.5 text-cold">
              {(c.deals[0].stageLabel ?? "—") +
                " · " +
                formatAmount(c.deals[0].amount)}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-cold">
            Sin deals asociados — continuar sin deal
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3.5 text-left">
      {context}
      <div className="text-[11px] font-semibold uppercase tracking-wide text-cold">
        Elegí un deal
      </div>
      <div className="flex flex-col gap-1.5">
        {c.deals.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onPick(c, d)}
            className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface px-2.5 py-2 text-left transition-all hover:border-violet/50"
          >
            <span className="text-[12.5px] font-semibold">
              {d.name ?? "Deal sin nombre"}
            </span>
            <span className="text-[11.5px] text-cold">
              {(d.stageLabel ?? "—") + " · " + formatAmount(d.amount)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

interface RecentDealCardProps {
  deal: RecentDeal;
  onClick: (deal: RecentDeal) => void;
}

function RecentDealCard({ deal: h, onClick }: RecentDealCardProps) {
  const si = stageIndex(h.stageKey);
  const progressPct = ((si + 1) / STAGES.length) * 100;

  return (
    <button
      type="button"
      onClick={() => onClick(h)}
      className="group flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 text-left transition-all hover:border-violet/40 hover:shadow-[0_4px_20px_rgba(44,90,246,0.10)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-violet-soft text-[13px] font-extrabold text-violet">
            {initials(h.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-bold">{h.name}</div>
            <div className="text-[11.5px] text-cold">{h.industry}</div>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div
            className={`text-[22px] font-extrabold leading-none ${scoreTextClass(h.score)}`}
          >
            {h.score}
          </div>
          <div className="text-[10px] text-cold">score</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip tone="violet">{h.deskless}% deskless</Chip>
        <Chip>{h.headcount} emp.</Chip>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-ink">
            {stageObj(h.stageKey).label}
          </span>
          <span className="text-[10.5px] text-cold">{h.updated}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-violet transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </button>
  );
}

export function InputScreen({
  onSearch,
  onOpenHistory,
  initialQuery = MOCK_INITIAL_QUERY,
}: InputScreenProps) {
  const [email, setEmail] = useState(initialQuery.email ?? "");
  const lead = useLeadSearch();
  const { search: leadSearch } = lead;

  const trimmedEmail = email.trim();
  const canSearch = trimmedEmail.length > 3 && trimmedEmail.includes("@");

  const trimmedEmailRef = useRef(trimmedEmail);
  trimmedEmailRef.current = trimmedEmail;

  const runSearch = useCallback(() => {
    const value = trimmedEmailRef.current;
    if (!(value.length > 3 && value.includes("@"))) return;
    void leadSearch({ email: value });
  }, [leadSearch]);

  const selectCandidate = useCallback(
    (c: LeadCandidate, deal?: LeadDeal) => {
      const currentEmail = trimmedEmailRef.current;
      // Prefer company-level names: company field → deal name → domain root → fullName
      const domainRoot = c.companyDomain ? c.companyDomain.split(".")[0] : null;
      const companyLabel =
        c.companyName?.trim() ||
        deal?.name?.trim() ||
        domainRoot ||
        c.fullName?.trim() ||
        currentEmail;

      onSearch({
        name: companyLabel,
        website: c.companyDomain?.trim() || undefined,
        email: c.contactEmail?.trim() || currentEmail,
        jobTitle: c.jobTitle?.trim() || undefined,
        companyName: c.companyName?.trim() || undefined,
        companyDomain: c.companyDomain?.trim() || undefined,
        contactEmail: c.contactEmail?.trim() || currentEmail,
        lifecycleStage: c.lifecycleStage?.trim() || undefined,
        deal,
      });
    },
    [onSearch],
  );

  return (
    <div className="min-h-screen bg-bg">
      <div className="border-b border-line bg-panel px-6 py-4 shadow-[0_1px_3px_rgba(15,27,61,0.05)]">
        <div className="mx-auto max-w-[1060px]">
          <Wordmark big />
        </div>
      </div>

      <div className="mx-auto max-w-[1060px] px-6">
        <div className="border-b border-line py-10 text-center">
          <h1 className="mb-2 text-[26px] font-extrabold tracking-tight text-ink">
            Analizá tu próximo deal
          </h1>
          <p className="mb-7 text-[13.5px] text-cold">
            Buscamos el lead en HubSpot por su email para enriquecer el
            análisis.
          </p>

          <div className="mx-auto flex max-w-[560px] gap-2">
            <input
              id="email"
              type="email"
              aria-label="Email del lead"
              value={email}
              placeholder="nombre@empresa.com"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
              className="h-12 flex-1 rounded-xl border-2 border-line bg-panel px-4 text-[15px] text-ink outline-none placeholder:text-cold/50 transition-colors focus:border-violet"
            />
            <button
              type="button"
              disabled={!canSearch}
              onClick={runSearch}
              className="h-12 rounded-xl border-2 border-violet bg-violet px-5 text-[14px] font-bold text-white transition-colors hover:bg-[#1f49e5] hover:border-[#1f49e5] disabled:cursor-not-allowed disabled:border-line disabled:bg-[#eee] disabled:text-[#999]"
            >
              Buscar →
            </button>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="text-[11.5px] text-cold">Ejemplos:</span>
            {MOCK_SEARCH_EXAMPLES.map((ex) => (
              <button
                key={ex.email}
                type="button"
                onClick={() => setEmail(ex.email)}
                className="rounded-full border border-line bg-panel px-2.5 py-1 text-xs transition-colors hover:border-violet/40 hover:bg-violet-soft"
              >
                <b className="font-semibold">{ex.email}</b>{" "}
                <span className="text-cold">· {ex.tag}</span>
              </button>
            ))}
          </div>
        </div>

        {lead.status !== "idle" && (
          <div className="mt-5">
            {lead.status === "loading" && (
              <div className="flex items-center gap-2.5 px-1 py-2 text-[13px] text-cold">
                <Spinner label="Buscando leads…" />
                Buscando leads en HubSpot…
              </div>
            )}

            {lead.status === "error" && (
              <Card title="No se pudo buscar el lead" accent="risk">
                <p className="text-[13px] text-cold">
                  {lead.error ?? "Error de búsqueda."}
                </p>
              </Card>
            )}

            {lead.status === "success" && lead.candidates.length === 0 && (
              <Card title="Sin coincidencias" accent="violet">
                <Empty text="No encontramos ningún lead para ese email. Verificá el email o cargá el lead en HubSpot antes de continuar." />
              </Card>
            )}

            {lead.status === "success" && lead.candidates.length > 0 && (
              <Card
                title="Deals encontrados"
                sub="Elegí el deal correcto para iniciar el análisis."
                accent="violet"
              >
                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
                  {lead.candidates.map((c) => (
                    <CandidateCard
                      key={c.id}
                      candidate={c}
                      onPick={selectCandidate}
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        <div className="pb-12 pt-8">
          <div className="mb-4 flex items-baseline justify-between">
            <div className="text-[16px] font-extrabold">
              Análisis recientes
            </div>
            <div className="text-xs text-cold">
              {MOCK_RECENT_DEALS.length} deals activos
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
            {MOCK_RECENT_DEALS.map((h) => (
              <RecentDealCard key={h.name} deal={h} onClick={onOpenHistory} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
