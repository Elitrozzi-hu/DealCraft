"use client";

import { useState } from "react";
import type { DealSearchRequest, LeadCandidate, RecentDeal } from "@/types";
import {
  Button,
  Card,
  Chip,
  Empty,
  Input,
  Label,
  Spinner,
  Wordmark,
} from "@/components/ui";
import { useLeadSearch } from "@/hooks/use-lead-search";
import { stageObj } from "@/lib/constants";
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

export function InputScreen({
  onSearch,
  onOpenHistory,
  initialQuery = MOCK_INITIAL_QUERY,
}: InputScreenProps) {
  const [email, setEmail] = useState(initialQuery.email ?? "");
  const lead = useLeadSearch();

  // The lead is searched by email only (decision: "siempre buscamos por su email").
  const trimmedEmail = email.trim();
  const canSearch = trimmedEmail.length > 3 && trimmedEmail.includes("@");

  const runSearch = () => {
    if (!canSearch) return;
    void lead.search({ email: trimmedEmail });
  };

  // Selecting a candidate seeds the existing deal-search flow with the lead's
  // resolved identifiers, falling back to the typed email when a field is null.
  // The CRM fields are forwarded to feed the Classidy webhook + deal-stage mapping.
  const selectCandidate = (c: LeadCandidate) => {
    onSearch({
      name: c.companyName?.trim() || c.fullName?.trim() || trimmedEmail,
      website: c.companyDomain?.trim() || undefined,
      email: c.contactEmail?.trim() || trimmedEmail,
      jobTitle: c.jobTitle?.trim() || undefined,
      companyName: c.companyName?.trim() || undefined,
      companyDomain: c.companyDomain?.trim() || undefined,
      contactEmail: c.contactEmail?.trim() || trimmedEmail,
      lifecycleStage: c.lifecycleStage?.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen px-6 py-7">
      <div className="mx-auto max-w-[1060px]">
        <div className="mb-5">
          <Wordmark big />
        </div>

        <Card
          title="Nuevo análisis"
          sub="Buscamos el lead en HubSpot por su email."
          accent="violet"
        >
          <div className="mt-1 flex flex-wrap items-end gap-2.5">
            <div className="flex-[1_1_280px]">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                value={email}
                placeholder="nombre@empresa.com"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
              />
            </div>
            <Button primary disabled={!canSearch} onClick={runSearch}>
              Buscar →
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] text-cold">Ejemplos:</span>
            {MOCK_SEARCH_EXAMPLES.map((ex) => (
              <button
                key={ex.email}
                type="button"
                onClick={() => setEmail(ex.email)}
                className="rounded-full border border-line bg-panel px-2.5 py-1 text-xs"
              >
                <b className="font-semibold">{ex.email}</b>{" "}
                <span className="text-cold">· {ex.tag}</span>
              </button>
            ))}
          </div>
        </Card>

        {lead.status !== "idle" && (
          <div className="mt-4">
            {lead.status === "loading" && (
              <div className="flex items-center gap-2.5 px-1 text-[13px] text-cold">
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
                title="Leads encontrados"
                sub="Elegí el lead correcto para iniciar el análisis."
                accent="violet"
              >
                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
                  {lead.candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCandidate(c)}
                      className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3.5 text-left transition-colors hover:border-violet"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="text-[14px] font-bold">
                          {c.fullName ?? c.jobTitle ?? c.contactEmail ?? "Contacto"}
                        </div>
                        {c.lifecycleStage && (
                          <Chip tone="violet">{c.lifecycleStage}</Chip>
                        )}
                      </div>
                      <div className="text-[12.5px] text-cold">
                        {c.companyName ?? "—"}
                        {c.companyDomain ? ` · ${c.companyDomain}` : ""}
                      </div>
                      <div className="text-[12px] text-cold">
                        {[c.jobTitle, c.contactEmail]
                          .filter(Boolean)
                          .join(" · ") || "Sin contacto"}
                      </div>
                      {(c.country || c.state || c.region || c.scoringTier) && (
                        <div className="flex items-center justify-between gap-2 text-[11px] text-cold">
                          <span>
                            {[c.country, c.state ?? c.region]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </span>
                          {c.scoringTier && (
                            <span className="rounded bg-violet-soft px-1.5 py-0.5 font-semibold text-violet">
                              {c.scoringTier}
                              {c.predictiveScore ? ` · ${c.predictiveScore}` : ""}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        <div className="mx-0.5 mb-3 mt-6 flex items-baseline justify-between">
          <div className="text-[15px] font-extrabold">Análisis recientes</div>
          <div className="text-xs text-cold">
            {MOCK_RECENT_DEALS.length} deals · tocá uno para retomarlo
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3.5">
          {MOCK_RECENT_DEALS.map((h) => (
            <button
              key={h.name}
              type="button"
              onClick={() => onOpenHistory(h)}
              className="flex flex-col gap-2.5 rounded-2xl border border-line bg-panel p-4 text-left"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="text-[14.5px] font-bold">{h.name}</div>
                <div className="flex flex-shrink-0 flex-col items-center">
                  <span
                    className={`text-lg font-extrabold leading-none ${scoreTextClass(h.score)}`}
                  >
                    {h.score}
                  </span>
                  <span className="text-[9px] text-cold">score</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Chip>{h.industry}</Chip>
                <Chip tone="violet">{h.deskless}% deskless</Chip>
                <Chip>{h.headcount} emp.</Chip>
              </div>
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-violet-soft px-2 py-0.5 text-[11px] font-bold text-violet">
                  {stageObj(h.stageKey).label}
                </span>
                <span className="text-[11px] text-cold">
                  actualizado {h.updated}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
