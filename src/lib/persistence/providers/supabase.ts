import { createClient, type PostgrestError } from "@supabase/supabase-js";

import type { PublishedSuccessCase, PreCallBrief, SignalsResult } from "../../../types/index.js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "../../server/env.js";
import type {
  DealAnalysisRecord,
  DealRecord,
  LlmCallInput,
  PersistenceProvider,
  RefreshAnalysisInput,
  SyncDealInput,
} from "../types.js";
import type { Database } from "./supabase.database.types.js";

function client() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set.");
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Created lazily (not at module scope) so importing this file in a test/build
// context without Supabase env vars set doesn't throw before a real call is made.
let supabase: ReturnType<typeof client> | null = null;
function db() {
  if (!supabase) supabase = client();
  return supabase;
}

function mapError(err: PostgrestError): Error {
  return new Error(`Supabase: ${err.message}`);
}

type DealRow = Database["public"]["Tables"]["deal"]["Row"];
type DealAnalysisRow = Database["public"]["Tables"]["deal_analysis"]["Row"];
type SuccessCaseRow = Database["public"]["Tables"]["success_case"]["Row"];

function mapDeal(row: DealRow): DealRecord {
  return {
    id: row.id,
    hubspotDealId: row.hubspot_deal_id,
    resolvedName: row.resolved_name,
    companyKey: row.company_key,
    domain: row.domain,
    region: row.region,
    stage: row.stage,
    amount: row.amount,
    segment: row.segment,
    industry: row.industry,
    lastActivity: row.last_activity,
    integraciones: row.integraciones,
    integrationModules: row.integration_modules,
    modulosDeInteres: row.modulos_de_interes,
    painDetected: row.pain_detected,
    lastSearchedAt: row.last_searched_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAnalysis(row: DealAnalysisRow): DealAnalysisRecord {
  return {
    id: row.id,
    dealId: row.deal_id,
    isLatest: row.is_latest,
    coldStart: row.cold_start,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: row.result as any,
    resultSchemaVersion: row.result_schema_version,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signals: row.signals as any,
    signalsFetchedAt: row.signals_fetched_at,
    signalsSchemaVersion: row.signals_schema_version,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    preCallBrief: row.pre_call_brief as any,
    preCallBriefGeneratedAt: row.pre_call_brief_generated_at,
    preCallBriefSchemaVersion: row.pre_call_brief_schema_version,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface SuccessCaseContent {
  company: string;
  country: string[];
  users: number | null;
  link_web: string | null;
  link_youtube: string | null;
  link_doc: string | null;
  link_video: null;
  quote_author: string | null;
  es: PublishedSuccessCase["content"]["es"];
  en: PublishedSuccessCase["content"]["en"];
}

function mapSuccessCase(row: SuccessCaseRow): PublishedSuccessCase {
  const content = row.content as unknown as SuccessCaseContent;
  return {
    id: row.id,
    slug: row.slug,
    company: content.company,
    country: content.country,
    users: content.users,
    link_web: content.link_web,
    link_youtube: content.link_youtube,
    link_doc: content.link_doc,
    link_video: content.link_video,
    quote_author: content.quote_author,
    content: { es: content.es, en: content.en },
    synced_at: row.synced_at ?? "",
  };
}

function toSuccessCaseContent(record: PublishedSuccessCase): SuccessCaseContent {
  return {
    company: record.company,
    country: record.country,
    users: record.users,
    link_web: record.link_web,
    link_youtube: record.link_youtube,
    link_doc: record.link_doc,
    link_video: record.link_video,
    quote_author: record.quote_author,
    es: record.content.es,
    en: record.content.en,
  };
}

export const supabasePersistenceProvider: PersistenceProvider = {
  name: "supabase",

  async findDeal(key) {
    let query = db().from("deal").select("*");
    if (key.hubspotDealId) {
      query = query.eq("hubspot_deal_id", key.hubspotDealId);
    } else if (key.companyKey) {
      query = query.eq("company_key", key.companyKey).is("hubspot_deal_id", null);
    } else {
      return null;
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw mapError(error);
    return data ? mapDeal(data) : null;
  },

  async getLatestAnalysis(dealId: string) {
    const { data, error } = await db()
      .from("deal_analysis")
      .select("*")
      .eq("deal_id", dealId)
      .eq("is_latest", true)
      .maybeSingle();
    if (error) throw mapError(error);
    return data ? mapAnalysis(data) : null;
  },

  async refreshAnalysis(input: RefreshAnalysisInput) {
    const { data, error } = await db().rpc("refresh_deal_analysis", {
      p_deal_id: input.dealId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p_result: input.result as any,
      p_cold_start: input.coldStart,
      p_generated_at: input.generatedAt,
    });
    if (error) throw mapError(error);
    return mapAnalysis(data as DealAnalysisRow);
  },

  async syncDealFromHubspot(input: SyncDealInput) {
    const existing = await this.findDeal(
      input.hubspotDealId
        ? { hubspotDealId: input.hubspotDealId }
        : { companyKey: input.companyKey },
    );

    const syncColumns = {
      hubspot_deal_id: input.hubspotDealId,
      resolved_name: input.resolvedName,
      domain: input.domain,
      region: input.region,
      stage: input.stage,
      amount: input.amount,
      segment: input.segment,
      industry: input.industry,
      last_activity: input.lastActivity,
      integraciones: input.integraciones,
      integration_modules: input.integrationModules,
      modulos_de_interes: input.modulosDeInteres,
      pain_detected: input.painDetected,
      last_searched_at: new Date().toISOString(),
    };

    if (existing) {
      const { data, error } = await db()
        .from("deal")
        .update(syncColumns)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw mapError(error);
      return mapDeal(data);
    }

    const { data, error } = await db().from("deal").insert(syncColumns).select().single();
    if (error) throw mapError(error);
    return mapDeal(data);
  },

  async updateSignals(dealAnalysisId: string, signals: SignalsResult, schemaVersion: number) {
    const { data, error } = await db().rpc("update_deal_analysis_signals", {
      p_id: dealAnalysisId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p_signals: signals as any,
      p_schema_version: schemaVersion,
    });
    if (error) throw mapError(error);
    return (data ?? 0) > 0;
  },

  async updatePreCallBrief(dealAnalysisId: string, brief: PreCallBrief, schemaVersion: number) {
    const { data, error } = await db().rpc("update_deal_analysis_pre_call_brief", {
      p_id: dealAnalysisId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p_brief: brief as any,
      p_schema_version: schemaVersion,
    });
    if (error) throw mapError(error);
    return (data ?? 0) > 0;
  },

  async listSuccessCases() {
    const { data, error } = await db().from("success_case").select("*");
    if (error) throw mapError(error);
    return (data ?? []).map(mapSuccessCase);
  },

  async getSuccessCasesByIndustry(industry: string | null) {
    if (!industry || industry.trim() === "") return [];
    const { data, error } = await db().rpc("success_cases_by_industry", { p_industry: industry });
    if (error) throw mapError(error);
    return (data ?? []).map(mapSuccessCase);
  },

  async upsertSuccessCase(record: PublishedSuccessCase) {
    const { error } = await db()
      .from("success_case")
      .upsert(
        {
          id: record.id,
          slug: record.slug,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: toSuccessCaseContent(record) as any,
          content_schema_version: 1,
          synced_at: record.synced_at,
        },
        { onConflict: "id" },
      );
    if (error) throw mapError(error);
  },

  async insertLlmCall(input: LlmCallInput) {
    const { error } = await db()
      .from("llm_call")
      .upsert(
        {
          call_id: input.callId,
          deal_id: input.dealId,
          deal_analysis_id: input.dealAnalysisId,
          task: input.task,
          provider: input.provider,
          model: input.model,
          input_tokens: input.inputTokens,
          output_tokens: input.outputTokens,
          total_tokens: input.totalTokens,
          cost_usd: input.costUsd,
        },
        { onConflict: "call_id", ignoreDuplicates: true },
      );
    if (error) throw mapError(error);
  },
};
