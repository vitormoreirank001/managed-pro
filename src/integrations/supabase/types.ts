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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      collaborator_payments: {
        Row: {
          collaborator_id: string
          created_at: string
          data: string
          descricao: string | null
          id: string
          tipo: string
          valor: number
        }
        Insert: {
          collaborator_id: string
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          tipo?: string
          valor: number
        }
        Update: {
          collaborator_id?: string
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_payments_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          ativo: boolean
          comissao_pct: number
          created_at: string
          email: string | null
          funcao: string | null
          id: string
          nome: string
          salario: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          comissao_pct?: number
          created_at?: string
          email?: string | null
          funcao?: string | null
          id?: string
          nome: string
          salario?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          comissao_pct?: number
          created_at?: string
          email?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          salario?: number
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          categoria: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          id: string
          valor: number
        }
        Insert: {
          categoria: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          id?: string
          valor: number
        }
        Update: {
          categoria?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          id?: string
          valor?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          loja_nome: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          loja_nome?: string
          nome?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          loja_nome?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          margem_padrao_max: number
          margem_padrao_min: number
          margem_padrao_tipo: Database["public"]["Enums"]["margin_type"]
          tema: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          margem_padrao_max?: number
          margem_padrao_min?: number
          margem_padrao_tipo?: Database["public"]["Enums"]["margin_type"]
          tema?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          margem_padrao_max?: number
          margem_padrao_min?: number
          margem_padrao_tipo?: Database["public"]["Enums"]["margin_type"]
          tema?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_expenses: {
        Row: {
          categoria: Database["public"]["Enums"]["expense_category"]
          created_at: string
          data: string
          descricao: string | null
          id: string
          valor: number
          vehicle_id: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          valor: number
          vehicle_id: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          valor?: number
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_images: {
        Row: {
          created_at: string
          id: string
          ordem: number
          storage_path: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordem?: number
          storage_path: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          storage_path?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_images_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          id: string
          user_id: string
          year: number
          month: number
          bronze_vendas: number
          prata_vendas: number
          ouro_vendas: number
          bronze_lucro: number
          prata_lucro: number
          ouro_lucro: number
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          year: number
          month: number
          bronze_vendas?: number
          prata_vendas?: number
          ouro_vendas?: number
          bronze_lucro?: number
          prata_lucro?: number
          ouro_lucro?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          year?: number
          month?: number
          bronze_vendas?: number
          prata_vendas?: number
          ouro_vendas?: number
          bronze_lucro?: number
          prata_lucro?: number
          ouro_lucro?: number
          created_at?: string | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          ano: number | null
          comprador_nome: string | null
          cor: string | null
          created_at: string
          created_by: string | null
          id: string
          km: number | null
          marca: string | null
          margem_max: number
          margem_min: number
          margem_tipo: Database["public"]["Enums"]["margin_type"]
          modelo: string
          observacoes: string | null
          placa: string | null
          sinal_valor: number | null
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          valor_compra: number
          valor_preparacao: number
          valor_sugerido: number | null
          valor_venda: number | null
          vendedor_id: string | null
          vendido_em: string | null
          autoconf_id: string | null
          autoconf_url: string | null
          synced_at: string | null
        }
        Insert: {
          ano?: number | null
          comprador_nome?: string | null
          cor?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          km?: number | null
          marca?: string | null
          margem_max?: number
          margem_min?: number
          margem_tipo?: Database["public"]["Enums"]["margin_type"]
          modelo: string
          observacoes?: string | null
          placa?: string | null
          sinal_valor?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          valor_compra?: number
          valor_preparacao?: number
          valor_sugerido?: number | null
          valor_venda?: number | null
          vendedor_id?: string | null
          vendido_em?: string | null
          autoconf_id?: string | null
          autoconf_url?: string | null
          synced_at?: string | null
        }
        Update: {
          ano?: number | null
          comprador_nome?: string | null
          cor?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          km?: number | null
          marca?: string | null
          margem_max?: number
          margem_min?: number
          margem_tipo?: Database["public"]["Enums"]["margin_type"]
          modelo?: string
          observacoes?: string | null
          placa?: string | null
          sinal_valor?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          valor_compra?: number
          valor_preparacao?: number
          valor_sugerido?: number | null
          valor_venda?: number | null
          vendedor_id?: string | null
          vendido_em?: string | null
          autoconf_id?: string | null
          autoconf_url?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "vendedor" | "marketing"
      expense_category:
        | "preparacao"
        | "marketing"
        | "gasolina"
        | "operacional"
        | "comissao"
        | "outras"
        | "doc_compra"
        | "manutencao"
        | "frete_venda"
        | "comissao_venda"
        | "doc_venda"
      margin_type: "valor" | "percentual"
      vehicle_status: "em_preparacao" | "pronto_venda" | "vendido" | "com_sinal"
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
      app_role: ["admin", "gestor", "vendedor", "marketing"],
      expense_category: [
        "preparacao",
        "marketing",
        "gasolina",
        "operacional",
        "comissao",
        "outras",
        "doc_compra",
        "manutencao",
        "frete_venda",
        "comissao_venda",
        "doc_venda",
      ],
      margin_type: ["valor", "percentual"],
      vehicle_status: ["em_preparacao", "pronto_venda", "vendido", "com_sinal"],
    },
  },
} as const
