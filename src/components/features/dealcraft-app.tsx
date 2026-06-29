import { useState } from "react";
import type {
  Deal,
  DealSearchRequest,
  DealSearchResult,
  PublishedSuccessCase,
  Pain,
  RecentDeal,
  StageKey,
  Stakeholder,
} from "@/types";
import {
  MOCK_DEAL,
  MOCK_INITIAL_QUERY,
  MOCK_PAINS,
  MOCK_STAKEHOLDERS,
} from "@/lib/fixtures";
import { Button, Card, Wordmark } from "@/components/ui";
import { useDealSearch } from "@/hooks/use-deal-search";
import { InputScreen, SearchingScreen } from "@/components/features/deal-analysis";
import { CopilotView, type ActiveMeta } from "@/components/features/copilot-view";

type View = "input" | "searching" | "copilot";

interface CopilotSession {
  deal: Deal;
  stakeholders: Stakeholder[];
  pains: Pain[];
  stage: StageKey;
  resolvedName: string;
  coldStart: boolean;
  activeMeta: ActiveMeta | null;
  website: string;
  successCases: PublishedSuccessCase[];
}

const historyToActiveMeta = (h: RecentDeal): ActiveMeta => ({
  industry: h.industry,
  headcount: h.headcount,
  deskless: `≈${h.deskless}% deskless`,
  region: "Argentina (AR)",
  website: h.name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12) + ".com",
});

export function DealCraftApp() {
  const [view, setView] = useState<View>("input");
  const [query, setQuery] = useState<DealSearchRequest>(MOCK_INITIAL_QUERY);
  const [session, setSession] = useState<CopilotSession | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const search = useDealSearch();
  const [pending, setPending] = useState<{
    result: DealSearchResult;
    website: string;
  } | null>(null);

  const onSearch = async (q: DealSearchRequest) => {
    setQuery(q);
    setPending(null);
    setView("searching");
    const result = await search.search(q);
    if (!result) return; // error → searching view renders the error state
    setPending({ result, website: q.website ?? "" });
  };

  const onAnalysisReady = () => {
    if (!pending) return;
    const { result, website } = pending;
    setSession({
      deal: result.deal,
      stakeholders: result.stakeholders,
      pains: result.pains,
      stage: result.deal.stage,
      resolvedName: result.resolvedName,
      coldStart: result.coldStart,
      activeMeta: null,
      website,
      successCases: result.successCases ?? [],
    });
    setSessionKey((k) => k + 1);
    setPending(null);
    setView("copilot");
  };

  const onOpenHistory = (h: RecentDeal) => {
    setSession({
      deal: MOCK_DEAL,
      stakeholders: MOCK_STAKEHOLDERS,
      pains: MOCK_PAINS,
      stage: h.stageKey,
      resolvedName: h.name,
      coldStart: false,
      activeMeta: historyToActiveMeta(h),
      website: historyToActiveMeta(h).website,
      successCases: [],
    });
    setSessionKey((k) => k + 1);
    setView("copilot");
  };

  const onNewSearch = () => {
    search.reset();
    setSession(null);
    setView("input");
  };

  if (view === "input") {
    return (
      <InputScreen
        onSearch={onSearch}
        onOpenHistory={onOpenHistory}
        initialQuery={query}
      />
    );
  }

  if (view === "searching") {
    if (search.status === "error") {
      return (
        <div className="grid min-h-screen place-items-center p-6">
          <div className="w-[520px] max-w-full">
            <div className="mb-8 flex justify-center">
              <Wordmark big />
            </div>
            <Card title="No se pudo completar la búsqueda" accent="risk">
              <p className="mb-4 text-[13px] text-cold">
                {search.error ?? "Error de búsqueda."}
              </p>
              <Button primary onClick={onNewSearch}>
                Volver al inicio
              </Button>
            </Card>
          </div>
        </div>
      );
    }
    return (
      <SearchingScreen
        query={query}
        steps={search.steps}
        step={search.step}
        onComplete={onAnalysisReady}
      />
    );
  }

  if (!session) {
    return (
      <InputScreen
        onSearch={onSearch}
        onOpenHistory={onOpenHistory}
        initialQuery={query}
      />
    );
  }

  return (
    <CopilotView
      key={sessionKey}
      deal={session.deal}
      stakeholders={session.stakeholders}
      pains={session.pains}
      stage={session.stage}
      resolvedName={session.resolvedName}
      coldStart={session.coldStart}
      activeMeta={session.activeMeta}
      website={session.website}
      successCases={session.successCases}
      onBack={onNewSearch}
    />
  );
}
