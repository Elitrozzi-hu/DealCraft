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
}

export interface RefreshAnalysisInput {
  dealId: string;
  result: DealSearchResult;
  coldStart: boolean;
  generatedAt: string;
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
}
