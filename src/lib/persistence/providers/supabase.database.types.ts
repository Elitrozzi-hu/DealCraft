export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      deal: {
        Row: {
          amount: number | null
          company_key: string | null
          created_at: string
          domain: string | null
          hubspot_deal_id: string | null
          id: string
          industry: string | null
          integraciones: string | null
          integration_modules: string | null
          last_activity: string | null
          last_searched_at: string | null
          modulos_de_interes: string | null
          pain_detected: string | null
          region: string | null
          resolved_name: string
          segment: string | null
          stage: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          company_key?: string | null
          created_at?: string
          domain?: string | null
          hubspot_deal_id?: string | null
          id?: string
          industry?: string | null
          integraciones?: string | null
          integration_modules?: string | null
          last_activity?: string | null
          last_searched_at?: string | null
          modulos_de_interes?: string | null
          pain_detected?: string | null
          region?: string | null
          resolved_name: string
          segment?: string | null
          stage?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          company_key?: string | null
          created_at?: string
          domain?: string | null
          hubspot_deal_id?: string | null
          id?: string
          industry?: string | null
          integraciones?: string | null
          integration_modules?: string | null
          last_activity?: string | null
          last_searched_at?: string | null
          modulos_de_interes?: string | null
          pain_detected?: string | null
          region?: string | null
          resolved_name?: string
          segment?: string | null
          stage?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      deal_analysis: {
        Row: {
          cold_start: boolean
          created_at: string
          deal_id: string
          generated_at: string
          id: string
          is_latest: boolean
          pre_call_brief: Json | null
          pre_call_brief_generated_at: string | null
          pre_call_brief_schema_version: number | null
          result: Json
          result_schema_version: number
          signals: Json | null
          signals_fetched_at: string | null
          signals_schema_version: number | null
          updated_at: string
        }
        Insert: {
          cold_start: boolean
          created_at?: string
          deal_id: string
          generated_at: string
          id?: string
          is_latest: boolean
          pre_call_brief?: Json | null
          pre_call_brief_generated_at?: string | null
          pre_call_brief_schema_version?: number | null
          result: Json
          result_schema_version?: number
          signals?: Json | null
          signals_fetched_at?: string | null
          signals_schema_version?: number | null
          updated_at?: string
        }
        Update: {
          cold_start?: boolean
          created_at?: string
          deal_id?: string
          generated_at?: string
          id?: string
          is_latest?: boolean
          pre_call_brief?: Json | null
          pre_call_brief_generated_at?: string | null
          pre_call_brief_schema_version?: number | null
          result?: Json
          result_schema_version?: number
          signals?: Json | null
          signals_fetched_at?: string | null
          signals_schema_version?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_analysis_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_call: {
        Row: {
          call_id: string
          cost_usd: number | null
          created_at: string
          deal_analysis_id: string | null
          deal_id: string | null
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          provider: string
          task: Database["public"]["Enums"]["llm_task"]
          total_tokens: number | null
        }
        Insert: {
          call_id: string
          cost_usd?: number | null
          created_at?: string
          deal_analysis_id?: string | null
          deal_id?: string | null
          id?: string
          input_tokens?: number | null
          model: string
          output_tokens?: number | null
          provider: string
          task: Database["public"]["Enums"]["llm_task"]
          total_tokens?: number | null
        }
        Update: {
          call_id?: string
          cost_usd?: number | null
          created_at?: string
          deal_analysis_id?: string | null
          deal_id?: string | null
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          provider?: string
          task?: Database["public"]["Enums"]["llm_task"]
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_call_deal_analysis_id_fkey"
            columns: ["deal_analysis_id"]
            isOneToOne: false
            referencedRelation: "deal_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_call_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal"
            referencedColumns: ["id"]
          },
        ]
      }
      success_case: {
        Row: {
          content: Json
          content_schema_version: number
          id: string
          slug: string
          synced_at: string | null
        }
        Insert: {
          content: Json
          content_schema_version?: number
          id: string
          slug: string
          synced_at?: string | null
        }
        Update: {
          content?: Json
          content_schema_version?: number
          id?: string
          slug?: string
          synced_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      refresh_deal_analysis: {
        Args: {
          p_cold_start: boolean
          p_deal_id: string
          p_generated_at: string
          p_result: Json
        }
        Returns: {
          cold_start: boolean
          created_at: string
          deal_id: string
          generated_at: string
          id: string
          is_latest: boolean
          pre_call_brief: Json | null
          pre_call_brief_generated_at: string | null
          pre_call_brief_schema_version: number | null
          result: Json
          result_schema_version: number
          signals: Json | null
          signals_fetched_at: string | null
          signals_schema_version: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "deal_analysis"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      success_cases_by_industry: {
        Args: { p_industry: string }
        Returns: {
          content: Json
          content_schema_version: number
          id: string
          slug: string
          synced_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "success_case"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_deal_analysis_pre_call_brief: {
        Args: { p_brief: Json; p_id: string; p_schema_version: number }
        Returns: number
      }
      update_deal_analysis_signals: {
        Args: { p_id: string; p_schema_version: number; p_signals: Json }
        Returns: number
      }
    }
    Enums: {
      llm_task: "company-research" | "company-signals" | "pre-call-brief" | "chat"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      llm_task: ["company-research", "company-signals", "pre-call-brief", "chat"],
    },
  },
} as const
