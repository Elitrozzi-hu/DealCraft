import type { DealSearchResult, PublishedSuccessCase, PreCallBrief, SignalsResult } from "../../types/index.js";
import type { LlmUsageEntry } from "../llm/types.js";

export type { LlmTask, LlmUsageEntry } from "../llm/types.js";

export interface LlmCallInput extends LlmUsageEntry {
  dealId: string | null;
  dealAnalysisId: string | null;
}

/** `deal` row, camelCase at the provider boundary (see providers/supabase.ts's
 *  Decisions on snake_case → camelCase mapping). */
export interface DealRecord {
  id: string;
  hubspotDealId: string | null;
  resolvedName: string;
  companyKey: string | null;
  domain: string | null;
  region: string | null;
  stage: string | null;
  amount: number | null;
  segment: string | null;
  industry: string | null;
  lastActivity: string | null;
  integraciones: string | null;
  integrationModules: string | null;
  modulosDeInteres: string | null;
  painDetected: string | null;
  lastSearchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for the cold-start → real-deal `syncDealFromHubspot` two-lookup-then-insert
 *  sequence (see the parent plan's Constraints & Decisions). */
export interface SyncDealInput {
  hubspotDealId: string | null;
  companyKey: string;
  resolvedName: string;
  domain: string | null;
  region: string | null;
  stage: string | null;
  amount: number | null;
  segment: string | null;
  industry: string | null;
  lastActivity: string | null;
  integraciones: string | null;
  integrationModules: string | null;
  modulosDeInteres: string | null;
  painDetected: string | null;
}

/** `deal_analysis` row, camelCase at the provider boundary. */
export interface DealAnalysisRecord {
  id: string;
  dealId: string;
  isLatest: boolean;
  coldStart: boolean;
  result: DealSearchResult;
  resultSchemaVersion: number;
  signals: SignalsResult | null;
  signalsFetchedAt: string | null;
  signalsSchemaVersion: number | null;
  preCallBrief: PreCallBrief | null;
  preCallBriefGeneratedAt: string | null;
  preCallBriefSchemaVersion: number | null;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string | null;
}

export interface RefreshAnalysisInput {
  dealId: string;
  result: DealSearchResult;
  coldStart: boolean;
  generatedAt: string;
  /** Actor who triggered this cold-start/refresh — stamped on the new row so
   *  "deals analyzed per user" is computable. Nullable for back-compat. */
  createdByEmail?: string | null;
}

export type AdminMetricsTrendBucket = "day" | "week" | "month";

export interface AdminMetricsBucketPoint {
  bucket: string;
  count: number;
}

/** Shape returned by the `get_admin_metrics` RPC (camelCase JSONB keys).
 *  All aggregations are all-time snapshots EXCEPT `analysesOverTime`, which
 *  honors the `trendSince`/`trendBucket` params. */
export interface AdminMetrics {
  totalDealsAnalyzed: number;
  totalCost: number;
  costPerDeal: {
    avg: number;
    min: number;
    max: number;
    topDeals: { dealId: string; name: string | null; cost: number }[];
  };
  costPerProvider: { provider: string; cost: number; calls: number }[];
  costByTask: { task: string; cost: number; calls: number }[];
  topModels: { model: string; cost: number; calls: number }[];
  dealsByUser: { user: string; deals: number }[];
  dealsByStage: { stage: string; deals: number }[];
  dealsByRegion: { region: string; deals: number }[];
  dealsByIndustry: { industry: string; deals: number }[];
  analysesOverTime: AdminMetricsBucketPoint[];
}

/** DB-agnostic persistence contract. One implementation per backing store,
 *  selected via `getPersistenceProvider()` (see registry.ts) — mirrors
 *  `EnrichmentProvider`/`CrmProvider`'s shape. */
export interface PersistenceProvider {
  readonly name: string;

  findDeal(key: {
    hubspotDealId?: string;
    companyKey?: string;
  }): Promise<DealRecord | null>;

  getLatestAnalysis(dealId: string): Promise<DealAnalysisRecord | null>;

  refreshAnalysis(input: RefreshAnalysisInput): Promise<DealAnalysisRecord>;

  syncDealFromHubspot(input: SyncDealInput): Promise<DealRecord>;

  /** Returns `false` (not a throw) when the write was skipped as stale — the
   *  target row was no longer `is_latest` by the time the guarded RPC ran. */
  updateSignals(
    dealAnalysisId: string,
    signals: SignalsResult,
    schemaVersion: number,
  ): Promise<boolean>;

  /** Same stale-write semantics as `updateSignals`. */
  updatePreCallBrief(
    dealAnalysisId: string,
    brief: PreCallBrief,
    schemaVersion: number,
  ): Promise<boolean>;

  listSuccessCases(): Promise<PublishedSuccessCase[]>;

  getSuccessCasesByIndustry(industry: string | null): Promise<PublishedSuccessCase[]>;

  upsertSuccessCase(record: PublishedSuccessCase): Promise<void>;

  insertLlmCall(input: LlmCallInput): Promise<void>;

  /** Admin-gate: true when `email` has a row in `admin_user`. */
  isAdminEmail(email: string): Promise<boolean>;

  /** Read-only aggregated dashboard metrics. */
  getAdminMetrics(opts: {
    trendSince: Date | null;
    trendBucket: AdminMetricsTrendBucket;
  }): Promise<AdminMetrics>;
}
