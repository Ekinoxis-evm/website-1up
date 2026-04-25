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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          added_by: string | null
          created_at: string | null
          email: string
          id: number
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          email: string
          id?: number
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          email?: string
          id?: number
        }
        Relationships: []
      }
      competitions: {
        Row: {
          city: string | null
          country: string
          created_at: string | null
          id: number
          player_id: number | null
          result: string
          tournament_name: string
          year: number
        }
        Insert: {
          city?: string | null
          country: string
          created_at?: string | null
          id?: number
          player_id?: number | null
          result: string
          tournament_name: string
          year: number
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string | null
          id?: number
          player_id?: number | null
          result?: string
          tournament_name?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "competitions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          duration_hours: number | null
          id: number
          image_url: string | null
          master_id: number | null
          is_active: boolean | null
          name: string
          price_cop: number | null
          sort_order: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: number
          image_url?: string | null
          master_id?: number | null
          is_active?: boolean | null
          name: string
          price_cop?: number | null
          sort_order?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: number
          image_url?: string | null
          master_id?: number | null
          is_active?: boolean | null
          name?: string
          price_cop?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "masters"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_rules: {
        Row: {
          id: number
          name: string
          description: string | null
          trigger_type: "comfenalco" | "promo_code" | "manual" | "auto"
          discount_pct: number
          applies_to: "courses" | "pass" | "all"
          aliado_id: number | null
          is_active: boolean | null
          valid_from: string | null
          valid_until: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          trigger_type: "comfenalco" | "promo_code" | "manual" | "auto"
          discount_pct: number
          applies_to: "courses" | "pass" | "all"
          aliado_id?: number | null
          is_active?: boolean | null
          valid_from?: string | null
          valid_until?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          trigger_type?: "comfenalco" | "promo_code" | "manual" | "auto"
          discount_pct?: number
          applies_to?: "courses" | "pass" | "all"
          aliado_id?: number | null
          is_active?: boolean | null
          valid_from?: string | null
          valid_until?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          id: number
          user_profile_id: number
          product_type: "course" | "pass"
          course_id: number | null
          original_price_cop: number
          discount_rule_id: number | null
          discount_pct_applied: number | null
          final_price_cop: number
          mp_preference_id: string | null
          mp_payment_id: string | null
          payment_status: "pending" | "approved" | "rejected" | "cancelled" | null
          paid_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          user_profile_id: number
          product_type: "course" | "pass"
          course_id?: number | null
          original_price_cop: number
          discount_rule_id?: number | null
          discount_pct_applied?: number | null
          final_price_cop: number
          mp_preference_id?: string | null
          mp_payment_id?: string | null
          payment_status?: "pending" | "approved" | "rejected" | "cancelled" | null
          paid_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          user_profile_id?: number
          product_type?: "course" | "pass"
          course_id?: number | null
          original_price_cop?: number
          discount_rule_id?: number | null
          discount_pct_applied?: number | null
          final_price_cop?: number
          mp_preference_id?: string | null
          mp_payment_id?: string | null
          payment_status?: "pending" | "approved" | "rejected" | "cancelled" | null
          paid_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_discount_rule_id_fkey"
            columns: ["discount_rule_id"]
            isOneToOne: false
            referencedRelation: "discount_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          id: number
          privy_user_id: string
          email: string | null
          nombre: string | null
          apellidos: string | null
          username: string | null
          phone_country: string | null
          phone_number: string | null
          game_ids: number[]
          tipo_documento: "CC" | "CE" | "TI" | "PP" | "NIT" | null
          numero_documento: string | null
          comfenalco_afiliado: boolean | null
          comfenalco_verified_at: string | null
          verified_aliados: number[] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          privy_user_id: string
          email?: string | null
          nombre?: string | null
          apellidos?: string | null
          username?: string | null
          phone_country?: string | null
          phone_number?: string | null
          game_ids?: number[]
          tipo_documento?: "CC" | "CE" | "TI" | "PP" | "NIT" | null
          numero_documento?: string | null
          comfenalco_afiliado?: boolean | null
          comfenalco_verified_at?: string | null
          verified_aliados?: number[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          privy_user_id?: string
          email?: string | null
          nombre?: string | null
          apellidos?: string | null
          username?: string | null
          phone_country?: string | null
          phone_number?: string | null
          game_ids?: number[]
          tipo_documento?: "CC" | "CE" | "TI" | "PP" | "NIT" | null
          numero_documento?: string | null
          comfenalco_afiliado?: boolean | null
          comfenalco_verified_at?: string | null
          verified_aliados?: number[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      floor_info: {
        Row: {
          accent_color: string | null
          created_at: string | null
          description: string
          floor_label: string
          id: number
          image_url: string | null
          sort_order: number | null
          title: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string | null
          description: string
          floor_label: string
          id?: number
          image_url?: string | null
          sort_order?: number | null
          title: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string | null
          description?: string
          floor_label?: string
          id?: number
          image_url?: string | null
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      game_categories: {
        Row: {
          created_at: string | null
          id: number
          image_url: string | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      games: {
        Row: {
          category_id: number
          created_at: string | null
          id: number
          image_url: string | null
          name: string
          sort_order: number | null
        }
        Insert: {
          category_id: number
          created_at?: string | null
          id?: number
          image_url?: string | null
          name: string
          sort_order?: number | null
        }
        Update: {
          category_id?: number
          created_at?: string | null
          id?: number
          image_url?: string | null
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "games_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "game_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      pass_benefits: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          created_at: string | null
          gamertag: string
          id: number
          instagram_url: string | null
          is_active: boolean | null
          kick_url: string | null
          photo_url: string | null
          real_name: string
          role: string | null
          sort_order: number | null
          tiktok_url: string | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string | null
          gamertag: string
          id?: number
          instagram_url?: string | null
          is_active?: boolean | null
          kick_url?: string | null
          photo_url?: string | null
          real_name: string
          role?: string | null
          sort_order?: number | null
          tiktok_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string | null
          gamertag?: string
          id?: number
          instagram_url?: string | null
          is_active?: boolean | null
          kick_url?: string | null
          photo_url?: string | null
          real_name?: string
          role?: string | null
          sort_order?: number | null
          tiktok_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      masters: {
        Row: {
          id: number
          name: string
          specialty: string | null
          bio: string | null
          photo_url: string | null
          instagram_url: string | null
          tiktok_url: string | null
          twitter_url: string | null
          youtube_url: string | null
          linkedin_url: string | null
          kick_url: string | null
          twitch_url: string | null
          github_url: string | null
          categories: string[] | null
          topics: string[] | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          specialty?: string | null
          bio?: string | null
          photo_url?: string | null
          instagram_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          youtube_url?: string | null
          linkedin_url?: string | null
          kick_url?: string | null
          twitch_url?: string | null
          github_url?: string | null
          categories?: string[] | null
          topics?: string[] | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          specialty?: string | null
          bio?: string | null
          photo_url?: string | null
          instagram_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          youtube_url?: string | null
          linkedin_url?: string | null
          kick_url?: string | null
          twitch_url?: string | null
          github_url?: string | null
          categories?: string[] | null
          topics?: string[] | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      aliados: {
        Row: {
          id: number
          name: string
          nit: string | null
          email: string | null
          api_url: string | null
          api_key: string | null
          logo_url: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          nit?: string | null
          email?: string | null
          api_url?: string | null
          api_key?: string | null
          logo_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          nit?: string | null
          email?: string | null
          api_url?: string | null
          api_key?: string | null
          logo_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      academia_content: {
        Row: {
          id: number
          course_id: number
          content_type: string
          title: string
          description: string | null
          url: string | null
          sort_order: number | null
          is_published: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          course_id: number
          content_type: string
          title: string
          description?: string | null
          url?: string | null
          sort_order?: number | null
          is_published?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          course_id?: number
          content_type?: string
          title?: string
          description?: string | null
          url?: string | null
          sort_order?: number | null
          is_published?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academia_content_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      social_links: {
        Row: {
          id: number
          platform: string
          url: string | null
          is_active: boolean | null
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          platform: string
          url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          platform?: string
          url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      recruitment_submissions: {
        Row: {
          category_id: number | null
          created_at: string | null
          email: string
          game_id: number | null
          gamertag: string | null
          id: number
          message: string | null
          name: string
          phone: string
          portfolio_url: string | null
          source: string | null
        }
        Insert: {
          category_id?: number | null
          created_at?: string | null
          email: string
          game_id?: number | null
          gamertag?: string | null
          id?: number
          message?: string | null
          name: string
          phone: string
          portfolio_url?: string | null
          source?: string | null
        }
        Update: {
          category_id?: number | null
          created_at?: string | null
          email?: string
          game_id?: number | null
          gamertag?: string | null
          id?: number
          message?: string | null
          name?: string
          phone?: string
          portfolio_url?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "game_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_submissions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          key: string
          image_url: string | null
          updated_at: string | null
        }
        Insert: {
          key: string
          image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          key?: string
          image_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

// Convenience type aliases — matches Supabase snake_case column names
export type GameCategory  = Database["public"]["Tables"]["game_categories"]["Row"];
export type Game          = Database["public"]["Tables"]["games"]["Row"];
export type Player        = Database["public"]["Tables"]["players"]["Row"];
export type Competition   = Database["public"]["Tables"]["competitions"]["Row"];
export type Course        = Database["public"]["Tables"]["courses"]["Row"];
export type PassBenefit   = Database["public"]["Tables"]["pass_benefits"]["Row"];
export type FloorInfo     = Database["public"]["Tables"]["floor_info"]["Row"];
export type Submission    = Database["public"]["Tables"]["recruitment_submissions"]["Row"];
export type UserProfile     = Database["public"]["Tables"]["user_profiles"]["Row"];
export type DiscountRule    = Database["public"]["Tables"]["discount_rules"]["Row"];
export type Enrollment      = Database["public"]["Tables"]["enrollments"]["Row"];
export type Master          = Database["public"]["Tables"]["masters"]["Row"];
export type Aliado          = Database["public"]["Tables"]["aliados"]["Row"];
export type AcademiaContent = Database["public"]["Tables"]["academia_content"]["Row"];
export type SocialLink      = Database["public"]["Tables"]["social_links"]["Row"];
export type SiteContent     = Database["public"]["Tables"]["site_content"]["Row"];
