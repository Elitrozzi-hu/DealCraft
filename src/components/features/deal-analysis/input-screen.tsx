import { memo, useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type {
  DealSearchRequest,
  Language,
  LeadCandidate,
  LeadDeal,
  RecentDeal,
} from "@/types";
import {
  Card,
  Chip,
  Empty,
  LanguageToggle,
  Spinner,
  Wordmark,
} from "@/components/ui";
import { useAuth } from "@/contexts/Auth";
import { useLeadSearch } from "@/hooks/use-lead-search";
import { formatNumber, useLanguage, useT } from "@/i18n";
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
  onLogout?: () => void;
}

function formatAmount(amount: number | null, lang: Language): string {
  return amount != null ? `USD ${formatNumber(amount, lang)}` : "—";
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
  const t = useT();
  const { lang } = useLanguage();
  const single = c.deals.length === 1;
  const multiple = c.deals.length > 1;

  const context = (
    <>
      <div className="flex items-start justify-between gap-2.5">
        <div className="text-[14px] font-bold leading-tight">
          {c.fullName ??
            c.jobTitle ??
            c.contactEmail ??
            t("landing.contactFallback")}
        </div>
        {c.lifecycleStage && <Chip tone="violet">{c.lifecycleStage}</Chip>}
      </div>
      <div className="text-[12.5px] text-cold">
        {c.companyName ?? "—"}
        {c.companyDomain ? ` · ${c.companyDomain}` : ""}
      </div>
      <div className="text-[12px] text-cold">
        {[c.jobTitle, c.contactEmail].filter(Boolean).join(" · ") ||
          t("landing.noContact")}
      </div>
      {(c.country || c.state || c.region) && (
        <div className="text-[11px] text-cold">
          {[c.country, c.state ?? c.region].filter(Boolean).join(" · ")}
        </div>
      )}
    </>
  );

  if (single) {
    const deal = c.deals[0];
    return (
      <button
        type="button"
        onClick={() => onPick(c, deal)}
        className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3.5 text-left transition-all hover:border-violet/50 hover:shadow-[0_4px_16px_rgba(44,90,246,0.10)]"
      >
        {context}
        <div className="rounded-xl border border-line bg-surface px-2.5 py-2 text-[12px]">
          <div className="font-semibold">
            {c.deals[0].name ?? t("landing.dealUnnamed")}
          </div>
          <div className="mt-0.5 text-cold">
            {(c.deals[0].stageLabel ?? "—") +
              " · " +
              formatAmount(c.deals[0].amount, lang)}
          </div>
        </div>
      </button>
    );
  }

  if (!multiple) {
    // No associated HubSpot deal — DealCraft only analyzes an actual deal, so
    // this contact is shown for context but can't be picked.
    return (
      <div className="flex cursor-not-allowed flex-col gap-2 rounded-2xl border border-line bg-panel p-3.5 text-left opacity-60">
        {context}
        <div className="text-[11px] text-cold">{t("landing.noDeals")}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3.5 text-left">
      {context}
      <div className="text-[11px] font-semibold uppercase tracking-wide text-cold">
        {t("landing.pickDeal")}
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
              {d.name ?? t("landing.dealUnnamed")}
            </span>
            <span className="text-[11.5px] text-cold">
              {(d.stageLabel ?? "—") + " · " + formatAmount(d.amount, lang)}
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
  const t = useT();
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
          <div className="text-[10px] text-cold">{t("landing.scoreLabel")}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip tone="violet">{t("common.desklessPct", { pct: h.deskless })}</Chip>
        <Chip>{t("common.empCount", { count: h.headcount })}</Chip>
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

function userInitials(name?: string, email?: string): string {
  if (name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export function InputScreen({
  onSearch,
  onOpenHistory,
  initialQuery = MOCK_INITIAL_QUERY,
  onLogout,
}: InputScreenProps) {
  const [email, setEmail] = useState(initialQuery.email ?? "");
  const t = useT();
  const { user } = useAuth();
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
        <div className="mx-auto flex max-w-[1060px] items-center justify-between gap-3">
          <Wordmark big />
          <div className="flex items-center gap-3">
            <LanguageToggle />
            {user?.isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-[12px] font-medium text-cold transition-colors hover:border-violet/40 hover:text-violet focus:outline-none focus-visible:ring-2 focus-visible:ring-violet/40"
              >
                Admin
              </Link>
            )}
            {onLogout && (
              <>
                <div className="h-4 w-px bg-line" />
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-violet-soft text-[11px] font-bold text-violet">
                    {userInitials(user?.name, user?.email)}
                  </div>
                  {user?.email && (
                    <span className="hidden text-[12px] text-cold sm:block">
                      {user.email}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-[12px] font-medium text-cold transition-colors hover:border-risk/30 hover:bg-risk-soft hover:text-risk focus:outline-none focus-visible:ring-2 focus-visible:ring-risk/40"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-[13px] w-[13px] flex-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M10 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3" />
                    <path d="M6.5 11L10 8 6.5 5" />
                    <path d="M10 8H2" />
                  </svg>
                  {t("auth.signOut")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1060px] px-6">
        <div className="border-b border-line py-10 text-center">
          <h1 className="mb-2 text-[26px] font-extrabold tracking-tight text-ink">
            {t("landing.heading")}
          </h1>
          <p className="mb-7 text-[13.5px] text-cold">{t("landing.subhead")}</p>

          <div className="mx-auto flex max-w-[560px] gap-2">
            <input
              id="email"
              type="email"
              aria-label={t("landing.emailLabel")}
              value={email}
              placeholder={t("landing.emailPlaceholder")}
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
              {t("landing.searchButton")}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="text-[11.5px] text-cold">{t("landing.examples")}</span>
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
                <Spinner label={t("landing.searchingLeads")} />
                {t("landing.searchingLeadsHub")}
              </div>
            )}

            {lead.status === "error" && (
              <Card title={t("landing.leadErrorTitle")} accent="risk">
                <p className="text-[13px] text-cold">
                  {lead.error ?? t("search.errorFallback")}
                </p>
              </Card>
            )}

            {lead.status === "success" && lead.candidates.length === 0 && (
              <Card title={t("landing.noMatchTitle")} accent="violet">
                <Empty text={t("landing.noMatchBody")} />
              </Card>
            )}

            {lead.status === "success" && lead.candidates.length > 0 && (
              <Card
                title={t("landing.dealsFoundTitle")}
                sub={t("landing.dealsFoundSub")}
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
              {t("landing.recentTitle")}
            </div>
            <div className="text-xs text-cold">
              {t("landing.recentCount", { count: MOCK_RECENT_DEALS.length })}
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
