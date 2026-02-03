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
          created_at: string | null
          event_id: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
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
      events: {
        Row: {
          created_at: string | null
          data_fim: string
          data_inicio: string
          id: string
          local: string
          nome_evento: string
          updated_at: string | null
          viatura_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_fim: string
          data_inicio: string
          id?: string
          local: string
          nome_evento: string
          updated_at?: string | null
          viatura_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          id?: string
          local?: string
          nome_evento?: string
          updated_at?: string | null
          viatura_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_viatura_id_fkey"
            columns: ["viatura_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
      is_admin: { Args: never; Returns: boolean }
      is_assigned_to_event: { Args: { event_uuid: string }; Returns: boolean }
    }
    Enums: {
      cargo_tipo: "admin" | "equipe"
      especialidade_tipo: "Médico" | "Enfermeiro" | "Técnico" | "Socorrista"
      status_viatura: "disponivel" | "em_uso" | "manutencao"
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
      cargo_tipo: ["admin", "equipe"],
      especialidade_tipo: ["Médico", "Enfermeiro", "Técnico", "Socorrista"],
      status_viatura: ["disponivel", "em_uso", "manutencao"],
    },
  },
} as const
