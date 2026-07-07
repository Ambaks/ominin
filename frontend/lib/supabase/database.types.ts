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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          etablissement_id: string
          id: string
          name: string
          position: number
          tagline: string | null
        }
        Insert: {
          created_at?: string
          etablissement_id: string
          id?: string
          name: string
          position: number
          tagline?: string | null
        }
        Update: {
          created_at?: string
          etablissement_id?: string
          id?: string
          name?: string
          position?: number
          tagline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      etablissements: {
        Row: {
          address: string
          cover_image: string | null
          created_at: string
          hours: string
          id: string
          name: string
          offre: Database["public"]["Enums"]["offre"]
          phone: string
          slug: string
          tagline: string
        }
        Insert: {
          address?: string
          cover_image?: string | null
          created_at?: string
          hours?: string
          id?: string
          name: string
          offre: Database["public"]["Enums"]["offre"]
          phone?: string
          slug: string
          tagline?: string
        }
        Update: {
          address?: string
          cover_image?: string | null
          created_at?: string
          hours?: string
          id?: string
          name?: string
          offre?: Database["public"]["Enums"]["offre"]
          phone?: string
          slug?: string
          tagline?: string
        }
        Relationships: []
      }
      formules: {
        Row: {
          created_at: string
          description: string | null
          disponible: boolean
          etablissement_id: string
          etapes: Json
          id: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          disponible?: boolean
          etablissement_id: string
          etapes?: Json
          id?: string
          name: string
          price: number
        }
        Update: {
          created_at?: string
          description?: string | null
          disponible?: boolean
          etablissement_id?: string
          etapes?: Json
          id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "formules_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          etablissement_id: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
        }
        Insert: {
          created_at?: string
          email: string
          etablissement_id: string
          id?: string
          role: Database["public"]["Enums"]["member_role"]
        }
        Update: {
          created_at?: string
          email?: string
          etablissement_id?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
        }
        Relationships: [
          {
            foreignKeyName: "invitations_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          badges: Database["public"]["Enums"]["badge"][]
          category_id: string
          created_at: string
          description: string | null
          detail: string | null
          disponible: boolean
          etablissement_id: string
          id: string
          image: string | null
          name: string
          options: Json
          pairing: string | null
          price: number
          stock: number | null
        }
        Insert: {
          badges?: Database["public"]["Enums"]["badge"][]
          category_id: string
          created_at?: string
          description?: string | null
          detail?: string | null
          disponible?: boolean
          etablissement_id: string
          id?: string
          image?: string | null
          name: string
          options?: Json
          pairing?: string | null
          price: number
          stock?: number | null
        }
        Update: {
          badges?: Database["public"]["Enums"]["badge"][]
          category_id?: string
          created_at?: string
          description?: string | null
          detail?: string | null
          disponible?: boolean
          etablissement_id?: string
          id?: string
          image?: string | null
          name?: string
          options?: Json
          pairing?: string | null
          price?: number
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_etablissement_id_fkey"
            columns: ["category_id", "etablissement_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "etablissement_id"]
          },
          {
            foreignKeyName: "items_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          email: string
          etablissement_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          etablissement_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          etablissement_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          item_id: string | null
          name: string
          options: Json
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          item_id?: string | null
          name: string
          options?: Json
          order_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          item_id?: string | null
          name?: string
          options?: Json
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          etablissement_id: string
          group_id: string | null
          id: string
          payment_mode: Database["public"]["Enums"]["payment_mode"] | null
          status: Database["public"]["Enums"]["order_status"]
          table_id: string
        }
        Insert: {
          created_at?: string
          etablissement_id: string
          group_id?: string | null
          id?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          status?: Database["public"]["Enums"]["order_status"]
          table_id: string
        }
        Update: {
          created_at?: string
          etablissement_id?: string
          group_id?: string | null
          id?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_group_id_etablissement_id_fkey"
            columns: ["group_id", "etablissement_id"]
            isOneToOne: false
            referencedRelation: "table_groups"
            referencedColumns: ["id", "etablissement_id"]
          },
          {
            foreignKeyName: "orders_table_id_etablissement_id_fkey"
            columns: ["table_id", "etablissement_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id", "etablissement_id"]
          },
        ]
      }
      table_groups: {
        Row: {
          created_at: string
          etablissement_id: string
          id: string
        }
        Insert: {
          created_at?: string
          etablissement_id: string
          id?: string
        }
        Update: {
          created_at?: string
          etablissement_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_groups_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          etablissement_id: string
          group_id: string | null
          id: string
          number: number
        }
        Insert: {
          etablissement_id: string
          group_id?: string | null
          id?: string
          number: number
        }
        Update: {
          etablissement_id?: string
          group_id?: string | null
          id?: string
          number?: number
        }
        Relationships: [
          {
            foreignKeyName: "tables_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_group_id_etablissement_id_fkey"
            columns: ["group_id", "etablissement_id"]
            isOneToOne: false
            referencedRelation: "table_groups"
            referencedColumns: ["id", "etablissement_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_etablissement: {
        Args: {
          p_name: string
          p_offre: Database["public"]["Enums"]["offre"]
          p_slug: string
          p_table_count: number
        }
        Returns: string
      }
      current_member_role: {
        Args: { etab: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
    }
    Enums: {
      badge: "maison" | "top" | "nouveau"
      member_role: "gerant" | "cuisinier" | "serveur"
      offre: "digital" | "smart" | "connect"
      order_status:
        | "en_attente"
        | "en_preparation"
        | "prete"
        | "servie"
        | "payee"
        | "annulee"
      payment_mode: "especes" | "carte"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      badge: ["maison", "top", "nouveau"],
      member_role: ["gerant", "cuisinier", "serveur"],
      offre: ["digital", "smart", "connect"],
      order_status: [
        "en_attente",
        "en_preparation",
        "prete",
        "servie",
        "payee",
        "annulee",
      ],
      payment_mode: ["especes", "carte"],
    },
  },
} as const
