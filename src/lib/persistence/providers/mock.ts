import { randomUUID } from "node:crypto";

import type { PublishedSuccessCase, PreCallBrief, SignalsResult } from "../../../types/index.js";
import type {
  AdminMetrics,
  AdminMetricsTrendBucket,
  DealAnalysisRecord,
  DealRecord,
  LlmCallInput,
  PersistenceProvider,
  RefreshAnalysisInput,
  SyncDealInput,
} from "../types.js";


const deals = new Map<string, DealRecord>();
const analyses = new Map<string, DealAnalysisRecord>();
const successCases = new Map<string, PublishedSuccessCase>();
const llmCalls = new Map<string, LlmCallInput>();

function now(): string {
  return new Date().toISOString();
}

export const mockPersistenceProvider: PersistenceProvider = {
  name: "mock",

  async findDeal(key) {
    const all = [...deals.values()];
    if (key.hubspotDealId) {
      return all.find((d) => d.hubspotDealId === key.hubspotDealId) ?? null;
    }
    if (key.companyKey) {
      return (
        all.find((d) => d.hubspotDealId === null && d.companyKey === key.companyKey) ?? null
      );
    }
    return null;
  },

  async getLatestAnalysis(dealId) {
    return [...analyses.values()].find((a) => a.dealId === dealId && a.isLatest) ?? null;
  },

  async refreshAnalysis(input: RefreshAnalysisInput) {
    for (const analysis of analyses.values()) {
      if (analysis.dealId === input.dealId && analysis.isLatest) {
        analysis.isLatest = false;
        analysis.updatedAt = now();
      }
    }
    const record: DealAnalysisRecord = {
      id: randomUUID(),
      dealId: input.dealId,
      isLatest: true,
      coldStart: input.coldStart,
      result: input.result,
      resultSchemaVersion: 1,
      signals: null,
      signalsFetchedAt: null,
      signalsSchemaVersion: null,
      preCallBrief: null,
      preCallBriefGeneratedAt: null,
      preCallBriefSchemaVersion: null,
      generatedAt: input.generatedAt,
      createdAt: now(),
      updatedAt: now(),
      createdByEmail: input.createdByEmail ?? null,
    };
    analyses.set(record.id, record);
    return record;
  },

  async syncDealFromHubspot(input: SyncDealInput) {
    const existing = input.hubspotDealId
      ? [...deals.values()].find((d) => d.hubspotDealId === input.hubspotDealId)
      : [...deals.values()].find(
          (d) => d.hubspotDealId === null && d.companyKey === input.companyKey,
        );

    const timestamp = now();
    if (existing) {
      Object.assign(existing, {
        hubspotDealId: input.hubspotDealId,
        resolvedName: input.resolvedName,
        companyKey: input.companyKey,
        domain: input.domain,
        region: input.region,
        stage: input.stage,
        amount: input.amount,
        segment: input.segment,
        industry: input.industry,
        lastActivity: input.lastActivity,
        integraciones: input.integraciones,
        integrationModules: input.integrationModules,
        modulosDeInteres: input.modulosDeInteres,
        painDetected: input.painDetected,
        lastSearchedAt: timestamp,
        updatedAt: timestamp,
      });
      return existing;
    }

    const record: DealRecord = {
      id: randomUUID(),
      hubspotDealId: input.hubspotDealId,
      resolvedName: input.resolvedName,
      companyKey: input.companyKey,
      domain: input.domain,
      region: input.region,
      stage: input.stage,
      amount: input.amount,
      segment: input.segment,
      industry: input.industry,
      lastActivity: input.lastActivity,
      integraciones: input.integraciones,
      integrationModules: input.integrationModules,
      modulosDeInteres: input.modulosDeInteres,
      painDetected: input.painDetected,
      lastSearchedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    deals.set(record.id, record);
    return record;
  },

  async updateSignals(dealAnalysisId: string, signals: SignalsResult, schemaVersion: number) {
    const analysis = analyses.get(dealAnalysisId);
    if (!analysis || !analysis.isLatest) return false;
    analysis.signals = signals;
    analysis.signalsFetchedAt = now();
    analysis.signalsSchemaVersion = schemaVersion;
    analysis.updatedAt = now();
    return true;
  },

  async updatePreCallBrief(dealAnalysisId: string, brief: PreCallBrief, schemaVersion: number) {
    const analysis = analyses.get(dealAnalysisId);
    if (!analysis || !analysis.isLatest) return false;
    analysis.preCallBrief = brief;
    analysis.preCallBriefGeneratedAt = now();
    analysis.preCallBriefSchemaVersion = schemaVersion;
    analysis.updatedAt = now();
    return true;
  },

  async listSuccessCases() {
    return [...successCases.values()];
  },

  async getSuccessCasesByIndustry(industry: string | null) {
    if (!industry || industry.trim() === "") return [];
    const b = industry.toLowerCase();
    return [...successCases.values()].filter((c) => {
      const es = c.content.es.industry.toLowerCase();
      const en = c.content.en?.industry.toLowerCase();
      return es.includes(b) || b.includes(es) || (en ? en.includes(b) || b.includes(en) : false);
    });
  },

  async upsertSuccessCase(record: PublishedSuccessCase) {
    successCases.set(record.id, record);
  },

  async insertLlmCall(input: LlmCallInput) {
    if (llmCalls.has(input.callId)) return;
    llmCalls.set(input.callId, input);
  },

  async isAdminEmail(email: string) {
    return email === "santiago.penenory@humand.co";
  },

  async getAdminMetrics(_opts: {
    trendSince: Date | null;
    trendBucket: AdminMetricsTrendBucket;
  }): Promise<AdminMetrics> {
    return {
      totalDealsAnalyzed: 0,
      totalCost: 0,
      costPerDeal: { avg: 0, min: 0, max: 0, topDeals: [] },
      costPerProvider: [],
      costByTask: [],
      topModels: [],
      dealsByUser: [],
      dealsByStage: [],
      dealsByRegion: [],
      dealsByIndustry: [],
      analysesOverTime: [],
    };
  },
};
