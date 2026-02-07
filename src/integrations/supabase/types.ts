export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bases: {
        Row: {
          created_at: string
          endereco: string | null
          id: string
          nome: string
          sigla: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
          sigla: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
          sigla?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_payments: {
        Row: {
          budget_id: string
          comprovante_url: string | null
          created_at: string | null
          data_pagamento: string
          id: string
          observacao: string | null
          tipo_pagamento: Database["public"]["Enums"]["tipo_pagamento"]
          valor: number
        }
        Insert: {
          budget_id: string
          comprovante_url?: string | null
          created_at?: string | null
          data_pagamento?: string
          id?: string
          observacao?: string | null
          tipo_pagamento: Database["public"]["Enums"]["tipo_pagamento"]
          valor: number
        }
        Update: {
          budget_id?: string
          comprovante_url?: string | null
          created_at?: string | null
          data_pagamento?: string
          id?: string
          observacao?: string | null
          tipo_pagamento?: Database["public"]["Enums"]["tipo_pagamento"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "event_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          cep: string | null
          created_at: string | null
          documento: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cep?: string | null
          created_at?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cep?: string | null
          created_at?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      clinical_attendances: {
        Row: {
          created_at: string | null
          documento: string | null
          event_id: string
          evolucao_clinica: string | null
          id: string
          idade: number | null
          nome_paciente: string
          profissional_id: string
          queixa_principal: string
          sexo: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          documento?: string | null
          event_id: string
          evolucao_clinica?: string | null
          id?: string
          idade?: number | null
          nome_paciente: string
          profissional_id: string
          queixa_principal: string
          sexo?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          documento?: string | null
          event_id?: string
          evolucao_clinica?: string | null
          id?: string
          idade?: number | null
          nome_paciente?: string
          profissional_id?: string
          queixa_principal?: string
          sexo?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_attendances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_attendances_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_assignments: {
        Row: {
          checkin_at: string | null
          checkout_at: string | null
          created_at: string | null
          event_id: string
          id: string
          km_final: number | null
          km_inicial: number | null
          profile_id: string
        }
        Insert: {
          checkin_at?: string | null
          checkout_at?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          profile_id: string
        }
        Update: {
          checkin_at?: string | null
          checkout_at?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_budgets: {
        Row: {
          base_id: string | null
          client_id: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          data_vencimento: string | null
          descricao: string | null
          endereco_evento: string | null
          event_id: string | null
          forma_cobranca: Database["public"]["Enums"]["forma_cobranca"] | null
          id: string
          km_estimado: number | null
          nome_evento: string | null
          status: Database["public"]["Enums"]["status_financeiro"] | null
          tipo_unidade: string | null
          updated_at: string | null
          valor_contrato: number
          valor_km: number | null
        }
        Insert: {
          base_id?: string | null
          client_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          endereco_evento?: string | null
          event_id?: string | null
          forma_cobranca?: Database["public"]["Enums"]["forma_cobranca"] | null
          id?: string
          km_estimado?: number | null
          nome_evento?: string | null
          status?: Database["public"]["Enums"]["status_financeiro"] | null
          tipo_unidade?: string | null
          updated_at?: string | null
          valor_contrato?: number
          valor_km?: number | null
        }
        Update: {
          base_id?: string | null
          client_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          endereco_evento?: string | null
          event_id?: string | null
          forma_cobranca?: Database["public"]["Enums"]["forma_cobranca"] | null
          id?: string
          km_estimado?: number | null
          nome_evento?: string | null
          status?: Database["public"]["Enums"]["status_financeiro"] | null
          tipo_unidade?: string | null
          updated_at?: string | null
          valor_contrato?: number
          valor_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_budgets_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_budgets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_expenses: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_despesa"]
          comprovante_url: string | null
          created_at: string | null
          data_despesa: string
          descricao: string
          event_id: string
          id: string
          registrado_por: string | null
          valor: number
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_despesa"]
          comprovante_url?: string | null
          created_at?: string | null
          data_despesa?: string
          descricao: string
          event_id: string
          id?: string
          registrado_por?: string | null
          valor: number
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_despesa"]
          comprovante_url?: string | null
          created_at?: string | null
          data_despesa?: string
          descricao?: string
          event_id?: string
          id?: string
          registrado_por?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_expenses_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          base_id: string | null
          consumo_medio_km_litro: number | null
          created_at: string | null
          data_fim: string
          data_inicio: string
          equipe_completa: boolean | null
          equipe_minima: number | null
          id: string
          local: string
          nome_evento: string
          updated_at: string | null
          valor_litro_combustivel: number | null
          viatura_id: string | null
        }
        Insert: {
          base_id?: string | null
          consumo_medio_km_litro?: number | null
          created_at?: string | null
          data_fim: string
          data_inicio: string
          equipe_completa?: boolean | null
          equipe_minima?: number | null
          id?: string
          local: string
          nome_evento: string
          updated_at?: string | null
          valor_litro_combustivel?: number | null
          viatura_id?: string | null
        }
        Update: {
          base_id?: string | null
          consumo_medio_km_litro?: number | null
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          equipe_completa?: boolean | null
          equipe_minima?: number | null
          id?: string
          local?: string
          nome_evento?: string
          updated_at?: string | null
          valor_litro_combustivel?: number | null
          viatura_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_viatura_id_fkey"
            columns: ["viatura_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_rates: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          tipo: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          tipo?: string
          updated_at?: string | null
          valor?: number
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          tipo?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: []
      }
      professional_payments: {
        Row: {
          created_at: string | null
          data_pagamento: string | null
          descricao: string | null
          event_id: string | null
          id: string
          profile_id: string
          status: Database["public"]["Enums"]["status_financeiro"] | null
          tipo_pagamento: Database["public"]["Enums"]["tipo_pagamento"]
          updated_at: string | null
          valor: number
        }
        Insert: {
          created_at?: string | null
          data_pagamento?: string | null
          descricao?: string | null
          event_id?: string | null
          id?: string
          profile_id: string
          status?: Database["public"]["Enums"]["status_financeiro"] | null
          tipo_pagamento: Database["public"]["Enums"]["tipo_pagamento"]
          updated_at?: string | null
          valor: number
        }
        Update: {
          created_at?: string | null
          data_pagamento?: string | null
          descricao?: string | null
          event_id?: string | null
          id?: string
          profile_id?: string
          status?: Database["public"]["Enums"]["status_financeiro"] | null
          tipo_pagamento?: Database["public"]["Enums"]["tipo_pagamento"]
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "professional_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_rates: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          updated_at: string | null
          valor_evento: number
          valor_hora: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          updated_at?: string | null
          valor_evento?: number
          valor_hora?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          updated_at?: string | null
          valor_evento?: number
          valor_hora?: number
        }
        Relationships: [
          {
            foreignKeyName: "professional_rates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cargo: Database["public"]["Enums"]["cargo_tipo"]
          created_at: string | null
          especialidade: Database["public"]["Enums"]["especialidade_tipo"]
          id: string
          nome: string
          registro_profissional: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cargo?: Database["public"]["Enums"]["cargo_tipo"]
          created_at?: string | null
          especialidade: Database["public"]["Enums"]["especialidade_tipo"]
          id?: string
          nome: string
          registro_profissional: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cargo?: Database["public"]["Enums"]["cargo_tipo"]
          created_at?: string | null
          especialidade?: Database["public"]["Enums"]["especialidade_tipo"]
          id?: string
          nome?: string
          registro_profissional?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      signatures: {
        Row: {
          assinatura_paciente_url: string | null
          assinatura_profissional_url: string | null
          attendance_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          assinatura_paciente_url?: string | null
          assinatura_profissional_url?: string | null
          attendance_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          assinatura_paciente_url?: string | null
          assinatura_profissional_url?: string | null
          attendance_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: true
            referencedRelation: "clinical_attendances"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string | null
          id: string
          modelo: string
          placa: string
          prefixo: string
          status: Database["public"]["Enums"]["status_viatura"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          modelo: string
          placa: string
          prefixo: string
          status?: Database["public"]["Enums"]["status_viatura"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          modelo?: string
          placa?: string
          prefixo?: string
          status?: Database["public"]["Enums"]["status_viatura"]
          updated_at?: string | null
        }
        Relationships: []
      }
      vital_signs: {
        Row: {
          attendance_id: string
          created_at: string | null
          frequencia_cardiaca: number | null
          frequencia_respiratoria: number | null
          glicemia: number | null
          horario: string | null
          id: string
          pa_diastolica: number | null
          pa_sistolica: number | null
          saturacao_o2: number | null
          temperatura: number | null
        }
        Insert: {
          attendance_id: string
          created_at?: string | null
          frequencia_cardiaca?: number | null
          frequencia_respiratoria?: number | null
          glicemia?: number | null
          horario?: string | null
          id?: string
          pa_diastolica?: number | null
          pa_sistolica?: number | null
          saturacao_o2?: number | null
          temperatura?: number | null
        }
        Update: {
          attendance_id?: string
          created_at?: string | null
          frequencia_cardiaca?: number | null
          frequencia_respiratoria?: number | null
          glicemia?: number | null
          horario?: string | null
          id?: string
          pa_diastolica?: number | null
          pa_sistolica?: number | null
          saturacao_o2?: number | null
          temperatura?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vital_signs_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "clinical_attendances"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_release_vehicle: {
        Args: { event_uuid: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_assigned_to_event: { Args: { event_uuid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "equipe"
      cargo_tipo: "admin" | "equipe"
      categoria_despesa:
        | "combustivel"
        | "equipamento"
        | "diaria"
        | "alimentacao"
        | "hospedagem"
        | "transporte"
        | "outros"
      especialidade_tipo: "Médico" | "Enfermeiro" | "Técnico" | "Socorrista"
      forma_cobranca:
        | "boleto"
        | "pix"
        | "emissao_nf"
        | "empenho"
        | "nao_cobrar"
        | "patrocinio"
      status_financeiro: "pendente" | "pago" | "cancelado" | "atrasado"
      status_viatura: "disponivel" | "em_uso" | "manutencao"
      tipo_pagamento:
        | "pix"
        | "transferencia"
        | "boleto"
        | "cartao"
        | "dinheiro"
        | "cheque"
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
      app_role: ["admin", "equipe"],
      cargo_tipo: ["admin", "equipe"],
      categoria_despesa: [
        "combustivel",
        "equipamento",
        "diaria",
        "alimentacao",
        "hospedagem",
        "transporte",
        "outros",
      ],
      especialidade_tipo: ["Médico", "Enfermeiro", "Técnico", "Socorrista"],
      forma_cobranca: [
        "boleto",
        "pix",
        "emissao_nf",
        "empenho",
        "nao_cobrar",
        "patrocinio",
      ],
      status_financeiro: ["pendente", "pago", "cancelado", "atrasado"],
      status_viatura: ["disponivel", "em_uso", "manutencao"],
      tipo_pagamento: [
        "pix",
        "transferencia",
        "boleto",
        "cartao",
        "dinheiro",
        "cheque",
      ],
    },
  },
} as const
