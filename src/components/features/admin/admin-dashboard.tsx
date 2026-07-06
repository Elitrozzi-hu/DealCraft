import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import type { AdminMetrics } from "@/lib/persistence/types";
import { Card, Chip, EmptyState, Spinner, Wordmark } from "@/components/ui";
import { useAuth } from "@/contexts/Auth";
import { useLanguage } from "@/i18n";
import { formatNumber } from "@/i18n";
import { BarChart, LineChart } from "./charts";

type Range = "30d" | "90d" | "all";

const RANGES: { key: Range; label: string }[] = [
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
];

async function fetchMetrics(range: Range): Promise<AdminMetrics> {
  const res = await fetch(`/api/admin/metrics?range=${range}`);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data: unknown = await res.json();
      if (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string") {
        message = (data as { error: string }).error;
      }
    } catch {
      // ignore — fall through to the generic message
    }
    throw new Error(message);
  }
  return res.json() as Promise<AdminMetrics>;
}

function fmtCost(n: number, lang: "es" | "en"): string {
  return `$${formatNumber(Number(n.toFixed(2)), lang)}`;
}

function userInitials(name?: string, email?: string): string {
  if (name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const { lang } = useLanguage();
  const [range, setRange] = useState<Range>("30d");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "metrics", range],
    queryFn: () => fetchMetrics(range),
    retry: false,
  });

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const costFmt = (v: number) => fmtCost(v, lang);

  return (
    <div className="min-h-screen bg-bg">
      <div className="border-b border-line bg-panel px-6 py-4 shadow-[0_1px_3px_rgba(15,27,61,0.05)]">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3">
          <Wordmark big />
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-[12px] font-medium text-cold transition-colors hover:border-violet/40 hover:text-violet focus:outline-none focus-visible:ring-2 focus-visible:ring-violet/40"
            >
              Back to app
            </Link>
            <div className="h-4 w-px bg-line" />
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-violet-soft text-[11px] font-bold text-violet">
                {userInitials(user?.name, user?.email)}
              </div>
              {user?.email && (
                <span className="hidden text-[12px] text-cold sm:block">{user.email}</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-[12px] font-medium text-cold transition-colors hover:border-risk/30 hover:bg-risk-soft hover:text-risk focus:outline-none focus-visible:ring-2 focus-visible:ring-risk/40"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Admin metrics</h1>
            <p className="mt-1 text-[12.5px] text-cold">
              Usage &amp; cost across all deals. Snapshots are all-time; the trend follows the selected range.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-line bg-panel p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                  range === r.key
                    ? "bg-violet text-white"
                    : "text-cold hover:text-violet"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="md" />
          </div>
        ) : isError ? (
          <Card accent="risk" title="Couldn't load metrics">
            <p className="mb-4 text-[13px] text-cold">
              {error instanceof Error ? error.message : "Something went wrong."}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-violet bg-violet px-4 py-2 text-[13px] font-bold text-white hover:bg-[#1f49e5] hover:border-[#1f49e5]"
            >
              Retry
            </button>
          </Card>
        ) : !data ? null : (
          <div className="flex flex-col gap-5">
            {/* Headline metrics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card title="Deals analyzed">
                <div className="text-[28px] font-extrabold text-ink">
                  {formatNumber(data.totalDealsAnalyzed, lang)}
                </div>
                <div className="mt-1 text-[11.5px] text-cold">distinct deals with a latest analysis</div>
              </Card>
              <Card title="Total LLM cost">
                <div className="text-[28px] font-extrabold text-ink">{fmtCost(data.totalCost, lang)}</div>
                <div className="mt-1 text-[11.5px] text-cold">all-time, every task</div>
              </Card>
              <Card title="Avg cost / deal">
                <div className="text-[28px] font-extrabold text-ink">
                  {fmtCost(data.costPerDeal.avg, lang)}
                </div>
                <div className="mt-1 text-[11.5px] text-cold">
                  min {fmtCost(data.costPerDeal.min, lang)} · max {fmtCost(data.costPerDeal.max, lang)}
                </div>
              </Card>
              <Card title="Analyses in range">
                <div className="text-[28px] font-extrabold text-ink">
                  {formatNumber(
                    data.analysesOverTime.reduce((s, p) => s + p.count, 0),
                    lang,
                  )}
                </div>
                <div className="mt-1 text-[11.5px] text-cold">analyses over the selected range</div>
              </Card>
            </div>

            {/* Trend */}
            <Card title="Analyses over time" sub="Bucketed by the selected range">
              {data.analysesOverTime.length === 0 ? (
                <EmptyState title="No analyses in this range" hint="Try a wider range." />
              ) : (
                <LineChart data={data.analysesOverTime} />
              )}
            </Card>

            {/* Cost breakdowns */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card title="Cost by provider">
                {data.costPerProvider.length === 0 ? (
                  <EmptyState title="No cost data" />
                ) : (
                  <BarChart
                    data={data.costPerProvider.map((p) => ({ label: p.provider, value: p.cost }))}
                    color="#2c5af6"
                    formatValue={costFmt}
                  />
                )}
              </Card>
              <Card title="Cost by task">
                {data.costByTask.length === 0 ? (
                  <EmptyState title="No cost data" />
                ) : (
                  <BarChart
                    data={data.costByTask.map((t) => ({ label: t.task, value: t.cost }))}
                    color="#7c5cff"
                    formatValue={costFmt}
                  />
                )}
              </Card>
              <Card title="Cost by model">
                {data.topModels.length === 0 ? (
                  <EmptyState title="No cost data" />
                ) : (
                  <BarChart
                    data={data.topModels.map((m) => ({ label: m.model, value: m.cost }))}
                    color="#22b8a6"
                    formatValue={costFmt}
                  />
                )}
              </Card>
            </div>

            {/* Deals per user + top deals */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card title="Deals analyzed per user" sub="Who created the current version">
                {data.dealsByUser.length === 0 ? (
                  <EmptyState title="No attribution yet" hint="New analyses stamp created_by_email." />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.dealsByUser.map((u) => (
                      <Chip key={u.user} tone={u.user === "unknown" ? "cold" : "violet"}>
                        {u.user}: {u.deals}
                      </Chip>
                    ))}
                  </div>
                )}
              </Card>
              <Card title="Top deals by cost" sub="Top 20">
                {data.costPerDeal.topDeals.length === 0 ? (
                  <EmptyState title="No cost data" />
                ) : (
                  <ol className="flex flex-col gap-1.5">
                    {data.costPerDeal.topDeals.map((d, i) => (
                      <li
                        key={d.dealId}
                        className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-[11px] font-bold text-cold">{i + 1}</span>
                          <span className="truncate text-[12.5px] font-semibold text-ink">
                            {d.name ?? d.dealId}
                          </span>
                        </div>
                        <span className="text-[12.5px] font-bold text-violet">{fmtCost(d.cost, lang)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </div>

            {/* Breakdowns by deal attributes */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card title="Deals by stage">
                {data.dealsByStage.length === 0 ? (
                  <EmptyState title="No data" />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.dealsByStage.map((s) => (
                      <Chip key={s.stage} tone="cold">
                        {s.stage}: {s.deals}
                      </Chip>
                    ))}
                  </div>
                )}
              </Card>
              <Card title="Deals by region">
                {data.dealsByRegion.length === 0 ? (
                  <EmptyState title="No data" />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.dealsByRegion.map((r) => (
                      <Chip key={r.region} tone="cold">
                        {r.region}: {r.deals}
                      </Chip>
                    ))}
                  </div>
                )}
              </Card>
              <Card title="Deals by industry">
                {data.dealsByIndustry.length === 0 ? (
                  <EmptyState title="No data" />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.dealsByIndustry.map((ind) => (
                      <Chip key={ind.industry} tone="cold">
                        {ind.industry}: {ind.deals}
                      </Chip>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboardPage;
