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
      academia_content: {
        Row: {
          content_type: string
          course_id: number
          created_at: string | null
          description: string | null
          id: number
          is_published: boolean | null
          sort_order: number | null
          stream_uid: string | null
          title: string
          url: string | null
        }
        Insert: {
          content_type: string
          course_id: number
          created_at?: string | null
          description?: string | null
          id?: number
          is_published?: boolean | null
          sort_order?: number | null
          stream_uid?: string | null
          title: string
          url?: string | null
        }
        Update: {
          content_type?: string
          course_id?: number
          created_at?: string | null
          description?: string | null
          id?: number
          is_published?: boolean | null
          sort_order?: number | null
          stream_uid?: string | null
          title?: string
          url?: string | null
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
      bracket_matches: {
        Row: {
          bracket_id:          number
          bracket_side:        string
          created_at:          string
          id:                  number
          loser_id:            number | null
          match_number:        number
          next_loser_match_id: number | null
          next_loser_slot:     number | null
          next_match_id:       number | null
          next_match_slot:     number | null
          p1_id:               number | null
          p1_score:            number | null
          p1_source:           Database["public"]["Enums"]["slot_source"] | null
          p1_source_match_id:  number | null
          p2_id:               number | null
          p2_score:            number | null
          p2_source:           Database["public"]["Enums"]["slot_source"] | null
          p2_source_match_id:  number | null
          round:               number
          state:               Database["public"]["Enums"]["match_state"]
          updated_at:          string
          winner_id:           number | null
        }
        Insert: {
          bracket_id:          number
          bracket_side?:       string
          created_at?:         string
          id?:                 number
          loser_id?:           number | null
          match_number:        number
          next_loser_match_id?: number | null
          next_loser_slot?:    number | null
          next_match_id?:      number | null
          next_match_slot?:    number | null
          p1_id?:              number | null
          p1_score?:           number | null
          p1_source?:          Database["public"]["Enums"]["slot_source"] | null
          p1_source_match_id?: number | null
          p2_id?:              number | null
          p2_score?:           number | null
          p2_source?:          Database["public"]["Enums"]["slot_source"] | null
          p2_source_match_id?: number | null
          round:               number
          state?:              Database["public"]["Enums"]["match_state"]
          updated_at?:         string
          winner_id?:          number | null
        }
        Update: {
          bracket_id?:         number
          bracket_side?:       string
          created_at?:         string
          id?:                 number
          loser_id?:           number | null
          match_number?:       number
          next_loser_match_id?: number | null
          next_loser_slot?:    number | null
          next_match_id?:      number | null
          next_match_slot?:    number | null
          p1_id?:              number | null
          p1_score?:           number | null
          p1_source?:          Database["public"]["Enums"]["slot_source"] | null
          p1_source_match_id?: number | null
          p2_id?:              number | null
          p2_score?:           number | null
          p2_source?:          Database["public"]["Enums"]["slot_source"] | null
          p2_source_match_id?: number | null
          round?:              number
          state?:              Database["public"]["Enums"]["match_state"]
          updated_at?:         string
          winner_id?:          number | null
        }
        Relationships: [
          {
            foreignKeyName: "bracket_matches_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "brackets"
            referencedColumns: ["id"]
          },
        ]
      }
      bracket_participants: {
        Row: {
          bracket_id:      number
          created_at:      string
          display_name:    string
          eliminated:      boolean
          id:              number
          seed:            number
          user_profile_id: number | null
        }
        Insert: {
          bracket_id:       number
          created_at?:      string
          display_name:     string
          eliminated?:      boolean
          id?:              number
          seed:             number
          user_profile_id?: number | null
        }
        Update: {
          bracket_id?:      number
          created_at?:      string
          display_name?:    string
          eliminated?:      boolean
          id?:              number
          seed?:            number
          user_profile_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bracket_participants_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "brackets"
            referencedColumns: ["id"]
          },
        ]
      }
      brackets: {
        Row: {
          created_at:        string
          format:            Database["public"]["Enums"]["bracket_format"]
          id:                number
          participant_count: number
          rounds_losers:     number
          rounds_winners:    number
          status:            Database["public"]["Enums"]["bracket_status"]
          tournament_id:     number
          updated_at:        string
        }
        Insert: {
          created_at?:        string
          format?:            Database["public"]["Enums"]["bracket_format"]
          id?:                number
          participant_count?: number
          rounds_losers?:     number
          rounds_winners?:    number
          status?:            Database["public"]["Enums"]["bracket_status"]
          tournament_id:      number
          updated_at?:        string
        }
        Update: {
          created_at?:        string
          format?:            Database["public"]["Enums"]["bracket_format"]
          id?:                number
          participant_count?: number
          rounds_losers?:     number
          rounds_winners?:    number
          status?:            Database["public"]["Enums"]["bracket_status"]
          tournament_id?:     number
          updated_at?:        string
        }
        Relationships: [
          {
            foreignKeyName: "brackets_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: true
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
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
      aliados: {
        Row: {
          api_key: string | null
          api_url: string | null
          created_at: string | null
          email: string | null
          id: number
          is_active: boolean | null
          logo_url: string | null
          name: string
          nit: string | null
          show_in_banner: boolean
          sort_order: number
          website_url: string | null
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          nit?: string | null
          show_in_banner?: boolean
          sort_order?: number
          website_url?: string | null
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          nit?: string | null
          show_in_banner?: boolean
          sort_order?: number
          website_url?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string
          account_type: string
          bank_name: string
          created_at: string
          holder_document: string | null
          holder_name: string
          id: number
          instructions: string | null
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_number: string
          account_type: string
          bank_name: string
          created_at?: string
          holder_document?: string | null
          holder_name: string
          id?: number
          instructions?: string | null
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_number?: string
          account_type?: string
          bank_name?: string
          created_at?: string
          holder_document?: string | null
          holder_name?: string
          id?: number
          instructions?: string | null
          is_active?: boolean
          sort_order?: number
          updated_at?: string
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
      course_modules: {
        Row: {
          course_id: number
          created_at: string
          description: string | null
          id: number
          is_published: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: number
          created_at?: string
          description?: string | null
          id?: number
          is_published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: number
          created_at?: string
          description?: string | null
          id?: number
          is_published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_session_documents: {
        Row: {
          created_at: string
          id: number
          label: string
          mime_type: string
          session_id: number
          size_bytes: number
          sort_order: number
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          label: string
          mime_type: string
          session_id: number
          size_bytes: number
          sort_order?: number
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          label?: string
          mime_type?: string
          session_id?: number
          size_bytes?: number
          sort_order?: number
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_session_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "course_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_session_links: {
        Row: {
          created_at: string
          id: number
          label: string
          session_id: number
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: number
          label: string
          session_id: number
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: number
          label?: string
          session_id?: number
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_session_links_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "course_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sessions: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: number
          is_published: boolean
          module_id: number
          sort_order: number
          title: string
          updated_at: string
          video_uid: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: number
          is_published?: boolean
          module_id: number
          sort_order?: number
          title: string
          updated_at?: string
          video_uid?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: number
          is_published?: boolean
          module_id?: number
          sort_order?: number
          title?: string
          updated_at?: string
          video_uid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
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
          intro_description: string | null
          intro_video_uid: string | null
          is_active: boolean | null
          master_id: number | null
          name: string
          price_cop: number | null
          price_token: number | null
          session_duration_min: number | null
          sort_order: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: number
          image_url?: string | null
          intro_description?: string | null
          intro_video_uid?: string | null
          is_active?: boolean | null
          master_id?: number | null
          name: string
          price_cop?: number | null
          price_token?: number | null
          session_duration_min?: number | null
          sort_order?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: number
          image_url?: string | null
          intro_description?: string | null
          intro_video_uid?: string | null
          is_active?: boolean | null
          master_id?: number | null
          name?: string
          price_cop?: number | null
          price_token?: number | null
          session_duration_min?: number | null
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
          aliado_id: number | null
          applies_to: Database["public"]["Enums"]["discount_applies_to"]
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_pct: number
          id: number
          is_active: boolean | null
          name: string
          trigger_type: Database["public"]["Enums"]["discount_trigger"]
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          aliado_id?: number | null
          applies_to: Database["public"]["Enums"]["discount_applies_to"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_pct: number
          id?: number
          is_active?: boolean | null
          name: string
          trigger_type: Database["public"]["Enums"]["discount_trigger"]
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          aliado_id?: number | null
          applies_to?: Database["public"]["Enums"]["discount_applies_to"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_pct?: number
          id?: number
          is_active?: boolean | null
          name?: string
          trigger_type?: Database["public"]["Enums"]["discount_trigger"]
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_rules_aliado_id_fkey"
            columns: ["aliado_id"]
            isOneToOne: false
            referencedRelation: "aliados"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          approved_tx_hash: string | null
          bank_account_id: number | null
          comprobante_url: string | null
          course_id: number | null
          created_at: string | null
          discount_pct_applied: number | null
          discount_rule_id: number | null
          final_price_cop: number
          id: number
          mp_payment_id: string | null
          mp_preference_id: string | null
          original_price_cop: number
          paid_at: string | null
          payment_method: string
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          product_type: Database["public"]["Enums"]["product_type"]
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          tx_hash: string | null
          user_profile_id: number
        }
        Insert: {
          approved_tx_hash?: string | null
          bank_account_id?: number | null
          comprobante_url?: string | null
          course_id?: number | null
          created_at?: string | null
          discount_pct_applied?: number | null
          discount_rule_id?: number | null
          final_price_cop: number
          id?: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          original_price_cop: number
          paid_at?: string | null
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          product_type: Database["public"]["Enums"]["product_type"]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tx_hash?: string | null
          user_profile_id: number
        }
        Update: {
          approved_tx_hash?: string | null
          bank_account_id?: number | null
          comprobante_url?: string | null
          course_id?: number | null
          created_at?: string | null
          discount_pct_applied?: number | null
          discount_rule_id?: number | null
          final_price_cop?: number
          id?: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          original_price_cop?: number
          paid_at?: string | null
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          product_type?: Database["public"]["Enums"]["product_type"]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tx_hash?: string | null
          user_profile_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
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
          {
            foreignKeyName: "enrollments_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "hall_of_fame"
            referencedColumns: ["user_profile_id"]
          },
          {
            foreignKeyName: "enrollments_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      international_tournaments: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          date: string | null
          description: string | null
          game_id: number | null
          id: number
          image_url: string | null
          is_active: boolean
          name: string
          organizer: string | null
          registration_link: string | null
          sort_order: number
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          game_id?: number | null
          id?: number
          image_url?: string | null
          is_active?: boolean
          name: string
          organizer?: string | null
          registration_link?: string | null
          sort_order?: number
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          game_id?: number | null
          id?: number
          image_url?: string | null
          is_active?: boolean
          name?: string
          organizer?: string | null
          registration_link?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "international_tournaments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      masters: {
        Row: {
          bio: string | null
          categories: string[] | null
          created_at: string | null
          github_url: string | null
          id: number
          instagram_url: string | null
          is_active: boolean | null
          kick_url: string | null
          linkedin_url: string | null
          name: string
          photo_url: string | null
          sort_order: number | null
          specialty: string | null
          tiktok_url: string | null
          topics: Json | null
          twitch_url: string | null
          twitter_url: string | null
          youtube_url: string | null
        }
        Insert: {
          bio?: string | null
          categories?: string[] | null
          created_at?: string | null
          github_url?: string | null
          id?: number
          instagram_url?: string | null
          is_active?: boolean | null
          kick_url?: string | null
          linkedin_url?: string | null
          name: string
          photo_url?: string | null
          sort_order?: number | null
          specialty?: string | null
          tiktok_url?: string | null
          topics?: Json | null
          twitch_url?: string | null
          twitter_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          bio?: string | null
          categories?: string[] | null
          created_at?: string | null
          github_url?: string | null
          id?: number
          instagram_url?: string | null
          is_active?: boolean | null
          kick_url?: string | null
          linkedin_url?: string | null
          name?: string
          photo_url?: string | null
          sort_order?: number | null
          specialty?: string | null
          tiktok_url?: string | null
          topics?: Json | null
          twitch_url?: string | null
          twitter_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
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
      pass_config: {
        Row: {
          duration_days: number
          id: number
          is_active: boolean
          price_token: number
          recipient_address: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          duration_days?: number
          id?: number
          is_active?: boolean
          price_token?: number
          recipient_address?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          duration_days?: number
          id?: number
          is_active?: boolean
          price_token?: number
          recipient_address?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      pass_orders: {
        Row: {
          admin_notes: string | null
          bank_account_id: number | null
          block_number: number | null
          comprobante_url: string | null
          created_at: string
          discount_pct_applied: number
          discount_rule_id: number | null
          duration_days: number
          email: string | null
          expires_at: string | null
          failure_reason: string | null
          granted_by: string | null
          id: number
          last_verified_at: string | null
          paid_at: string | null
          payment_method: string
          privy_user_id: string
          recipient_address: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["pass_order_status"]
          token_amount_paid: number
          token_price_at_purchase: number
          tx_hash: string | null
          updated_at: string
          user_profile_id: number
          verification_attempts: number
          wallet_address: string
        }
        Insert: {
          admin_notes?: string | null
          bank_account_id?: number | null
          block_number?: number | null
          comprobante_url?: string | null
          created_at?: string
          discount_pct_applied?: number
          discount_rule_id?: number | null
          duration_days?: number
          email?: string | null
          expires_at?: string | null
          failure_reason?: string | null
          granted_by?: string | null
          id?: number
          last_verified_at?: string | null
          paid_at?: string | null
          payment_method?: string
          privy_user_id: string
          recipient_address: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["pass_order_status"]
          token_amount_paid: number
          token_price_at_purchase: number
          tx_hash?: string | null
          updated_at?: string
          user_profile_id: number
          verification_attempts?: number
          wallet_address: string
        }
        Update: {
          admin_notes?: string | null
          bank_account_id?: number | null
          block_number?: number | null
          comprobante_url?: string | null
          created_at?: string
          discount_pct_applied?: number
          discount_rule_id?: number | null
          duration_days?: number
          email?: string | null
          expires_at?: string | null
          failure_reason?: string | null
          granted_by?: string | null
          id?: number
          last_verified_at?: string | null
          paid_at?: string | null
          payment_method?: string
          privy_user_id?: string
          recipient_address?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["pass_order_status"]
          token_amount_paid?: number
          token_price_at_purchase?: number
          tx_hash?: string | null
          updated_at?: string
          user_profile_id?: number
          verification_attempts?: number
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "pass_orders_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pass_orders_discount_rule_id_fkey"
            columns: ["discount_rule_id"]
            isOneToOne: false
            referencedRelation: "discount_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pass_orders_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "hall_of_fame"
            referencedColumns: ["user_profile_id"]
          },
          {
            foreignKeyName: "pass_orders_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean
          max_uses: number | null
          updated_at: string | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string | null
          used_count?: number
        }
        Relationships: []
      }
      site_content: {
        Row: {
          image_url: string | null
          key: string
          updated_at: string | null
        }
        Insert: {
          image_url?: string | null
          key: string
          updated_at?: string | null
        }
        Update: {
          image_url?: string | null
          key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean | null
          platform: string
          sort_order: number | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          platform: string
          sort_order?: number | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          platform?: string
          sort_order?: number | null
          url?: string | null
        }
        Relationships: []
      }
      token_purchase_orders: {
        Row: {
          admin_notes: string | null
          approved_tx_hash: string | null
          bank_account_id: number | null
          celular_contacto: string
          comprobante_url: string
          cop_amount: number
          created_at: string
          email: string
          exchange_rate_cop: number
          id: number
          nombre: string
          privy_user_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["token_purchase_status"]
          token_amount: number
          updated_at: string
          user_profile_id: number
          wallet_address: string
        }
        Insert: {
          admin_notes?: string | null
          approved_tx_hash?: string | null
          bank_account_id?: number | null
          celular_contacto: string
          comprobante_url: string
          cop_amount: number
          created_at?: string
          email: string
          exchange_rate_cop?: number
          id?: number
          nombre: string
          privy_user_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["token_purchase_status"]
          token_amount: number
          updated_at?: string
          user_profile_id: number
          wallet_address: string
        }
        Update: {
          admin_notes?: string | null
          approved_tx_hash?: string | null
          bank_account_id?: number | null
          celular_contacto?: string
          comprobante_url?: string
          cop_amount?: number
          created_at?: string
          email?: string
          exchange_rate_cop?: number
          id?: number
          nombre?: string
          privy_user_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["token_purchase_status"]
          token_amount?: number
          updated_at?: string
          user_profile_id?: number
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_purchase_orders_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_purchase_orders_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "hall_of_fame"
            referencedColumns: ["user_profile_id"]
          },
          {
            foreignKeyName: "token_purchase_orders_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_prizes: {
        Row: {
          amount_cop: number | null
          amount_tokens: number | null
          created_at: string
          id: number
          position: number
          prize_type: string
          tournament_id: number
        }
        Insert: {
          amount_cop?: number | null
          amount_tokens?: number | null
          created_at?: string
          id?: number
          position: number
          prize_type: string
          tournament_id: number
        }
        Update: {
          amount_cop?: number | null
          amount_tokens?: number | null
          created_at?: string
          id?: number
          position?: number
          prize_type?: string
          tournament_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_prizes_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          cancelled_at: string | null
          id: number
          notes: string | null
          privy_user_id: string
          registered_at: string
          status: string
          tournament_id: number
          user_profile_id: number
        }
        Insert: {
          cancelled_at?: string | null
          id?: number
          notes?: string | null
          privy_user_id: string
          registered_at?: string
          status?: string
          tournament_id: number
          user_profile_id: number
        }
        Update: {
          cancelled_at?: string | null
          id?: number
          notes?: string | null
          privy_user_id?: string
          registered_at?: string
          status?: string
          tournament_id?: number
          user_profile_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "hall_of_fame"
            referencedColumns: ["user_profile_id"]
          },
          {
            foreignKeyName: "tournament_registrations_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_results: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          id: number
          points: number
          position: number
          prize_comprobante_url: string | null
          prize_sent_at: string | null
          prize_sent_by: string | null
          prize_status: Database["public"]["Enums"]["prize_delivery_status"]
          prize_tx_hash: string | null
          tournament_id: number
          user_profile_id: number
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          id?: number
          points: number
          position: number
          prize_comprobante_url?: string | null
          prize_sent_at?: string | null
          prize_sent_by?: string | null
          prize_status?: Database["public"]["Enums"]["prize_delivery_status"]
          prize_tx_hash?: string | null
          tournament_id: number
          user_profile_id: number
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          id?: number
          points?: number
          position?: number
          prize_comprobante_url?: string | null
          prize_sent_at?: string | null
          prize_sent_by?: string | null
          prize_status?: Database["public"]["Enums"]["prize_delivery_status"]
          prize_tx_hash?: string | null
          tournament_id?: number
          user_profile_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_results_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_results_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "hall_of_fame"
            referencedColumns: ["user_profile_id"]
          },
          {
            foreignKeyName: "tournament_results_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          game_id: number | null
          id: number
          image_url: string | null
          is_active: boolean
          is_registration_open: boolean
          location_type: string
          max_participants: number | null
          name: string
          prize_pool_cop: number | null
          slug: string | null
          sort_order: number
          sponsor_logo_url: string | null
          sponsor_name: string | null
          sponsor_website_url: string | null
          status: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          game_id?: number | null
          id?: number
          image_url?: string | null
          is_active?: boolean
          is_registration_open?: boolean
          location_type?: string
          max_participants?: number | null
          name: string
          prize_pool_cop?: number | null
          slug?: string | null
          sort_order?: number
          sponsor_logo_url?: string | null
          sponsor_name?: string | null
          sponsor_website_url?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          game_id?: number | null
          id?: number
          image_url?: string | null
          is_active?: boolean
          is_registration_open?: boolean
          location_type?: string
          max_participants?: number | null
          name?: string
          prize_pool_cop?: number | null
          slug?: string | null
          sort_order?: number
          sponsor_logo_url?: string | null
          sponsor_name?: string | null
          sponsor_website_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          apellidos: string | null
          barrio: string | null
          birth_date: string | null
          comfenalco_afiliado: boolean | null
          comfenalco_verified_at: string | null
          created_at: string | null
          email: string | null
          game_ids: number[]
          id: number
          nombre: string | null
          numero_documento: string | null
          onboarding_completed_at: string | null
          pass_status: Database["public"]["Enums"]["pass_status_enum"]
          phone_country: string | null
          phone_number: string | null
          privy_user_id: string
          referred_by_code: string | null
          tipo_documento: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at: string | null
          username: string | null
          verified_aliados: Json | null
        }
        Insert: {
          apellidos?: string | null
          barrio?: string | null
          birth_date?: string | null
          comfenalco_afiliado?: boolean | null
          comfenalco_verified_at?: string | null
          created_at?: string | null
          email?: string | null
          game_ids?: number[]
          id?: number
          nombre?: string | null
          numero_documento?: string | null
          onboarding_completed_at?: string | null
          pass_status?: Database["public"]["Enums"]["pass_status_enum"]
          phone_country?: string | null
          phone_number?: string | null
          privy_user_id: string
          referred_by_code?: string | null
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at?: string | null
          username?: string | null
          verified_aliados?: Json | null
        }
        Update: {
          apellidos?: string | null
          barrio?: string | null
          birth_date?: string | null
          comfenalco_afiliado?: boolean | null
          comfenalco_verified_at?: string | null
          created_at?: string | null
          email?: string | null
          game_ids?: number[]
          id?: number
          nombre?: string | null
          numero_documento?: string | null
          onboarding_completed_at?: string | null
          pass_status?: Database["public"]["Enums"]["pass_status_enum"]
          phone_country?: string | null
          phone_number?: string | null
          privy_user_id?: string
          referred_by_code?: string | null
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at?: string | null
          username?: string | null
          verified_aliados?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      hall_of_fame: {
        Row: {
          apellidos: string | null
          bronze_count: number | null
          gold_count: number | null
          nombre: string | null
          silver_count: number | null
          total_points: number | null
          user_profile_id: number | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      register_for_tournament: {
        Args: { privy_uid: string; tour_id: number; user_pid: number }
        Returns: Json
      }
      report_match_result: {
        Args: { p_match_id: number; p_p1_score: number; p_p2_score: number }
        Returns: Json
      }
    }
    Enums: {
      bracket_format: "single_elimination" | "double_elimination"
      bracket_status: "draft" | "published" | "in_progress" | "completed"
      discount_applies_to: "courses" | "pass" | "all"
      discount_trigger: "comfenalco" | "promo_code" | "manual" | "auto"
      match_state: "pending" | "ready" | "in_progress" | "completed" | "bye"
      slot_source: "seed" | "winner_of" | "loser_of" | "bye"
      pass_order_status:
        | "pending_tx"
        | "confirmed"
        | "failed"
        | "expired_unverified"
        | "pending_bank"
      pass_status_enum: "never" | "active" | "expired"
      payment_status: "pending" | "approved" | "rejected" | "cancelled"
      prize_delivery_status: "no_prize" | "pending" | "sent"
      product_type: "course" | "pass"
      tipo_documento: "CC" | "CE" | "TI" | "PP" | "NIT"
      token_purchase_status: "pending" | "approved" | "rejected" | "cancelled"
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
      bracket_format: ["single_elimination", "double_elimination"],
      bracket_status: ["draft", "published", "in_progress", "completed"],
      discount_applies_to: ["courses", "pass", "all"],
      match_state: ["pending", "ready", "in_progress", "completed", "bye"],
      slot_source: ["seed", "winner_of", "loser_of", "bye"],
      discount_trigger: ["comfenalco", "promo_code", "manual", "auto"],
      pass_order_status: [
        "pending_tx",
        "confirmed",
        "failed",
        "expired_unverified",
        "pending_bank",
      ],
      pass_status_enum: ["never", "active", "expired"],
      payment_status: ["pending", "approved", "rejected", "cancelled"],
      prize_delivery_status: ["no_prize", "pending", "sent"],
      product_type: ["course", "pass"],
      tipo_documento: ["CC", "CE", "TI", "PP", "NIT"],
      token_purchase_status: ["pending", "approved", "rejected", "cancelled"],
    },
  },
} as const

// Convenience row aliases
export type GameCategory     = Database["public"]["Tables"]["game_categories"]["Row"];
export type Game             = Database["public"]["Tables"]["games"]["Row"];
export type Player           = Database["public"]["Tables"]["players"]["Row"];
export type Competition      = Database["public"]["Tables"]["competitions"]["Row"];
export type Course           = Database["public"]["Tables"]["courses"]["Row"];
export type PassBenefit      = Database["public"]["Tables"]["pass_benefits"]["Row"];
export type FloorInfo        = Database["public"]["Tables"]["floor_info"]["Row"];
export type Submission       = Database["public"]["Tables"]["recruitment_submissions"]["Row"];
export type UserProfile      = Database["public"]["Tables"]["user_profiles"]["Row"];
export type DiscountRule     = Database["public"]["Tables"]["discount_rules"]["Row"];
export type Enrollment       = Database["public"]["Tables"]["enrollments"]["Row"];
export type Master           = Database["public"]["Tables"]["masters"]["Row"];
export type Aliado           = Database["public"]["Tables"]["aliados"]["Row"];
export type AcademiaContent  = Database["public"]["Tables"]["academia_content"]["Row"];
export type SocialLink       = Database["public"]["Tables"]["social_links"]["Row"];
export type SiteContent      = Database["public"]["Tables"]["site_content"]["Row"];
export type BankAccount      = Database["public"]["Tables"]["bank_accounts"]["Row"];
export type TokenPurchaseOrder  = Database["public"]["Tables"]["token_purchase_orders"]["Row"];
export type TokenPurchaseStatus = Database["public"]["Enums"]["token_purchase_status"];
export type PassConfig       = Database["public"]["Tables"]["pass_config"]["Row"];
export type PassOrder        = Database["public"]["Tables"]["pass_orders"]["Row"];
export type PassOrderStatus  = Database["public"]["Enums"]["pass_order_status"];
export type PassStatusEnum   = Database["public"]["Enums"]["pass_status_enum"];
export type ReferralCode     = Database["public"]["Tables"]["referral_codes"]["Row"];
export type Tournament       = Database["public"]["Tables"]["tournaments"]["Row"];
export type TournamentPrize        = Database["public"]["Tables"]["tournament_prizes"]["Row"];
export type TournamentRegistration   = Database["public"]["Tables"]["tournament_registrations"]["Row"];
export type InternationalTournament  = Database["public"]["Tables"]["international_tournaments"]["Row"];
export type TournamentResult         = Database["public"]["Tables"]["tournament_results"]["Row"];
export type PrizeDeliveryStatus      = Database["public"]["Enums"]["prize_delivery_status"];

// Bracket aliases
export type Bracket             = Database["public"]["Tables"]["brackets"]["Row"];
export type BracketParticipant  = Database["public"]["Tables"]["bracket_participants"]["Row"];
export type BracketMatch        = Database["public"]["Tables"]["bracket_matches"]["Row"];
export type BracketFormat       = Database["public"]["Enums"]["bracket_format"];
export type BracketStatus       = Database["public"]["Enums"]["bracket_status"];
export type MatchState          = Database["public"]["Enums"]["match_state"];
export type SlotSource          = Database["public"]["Enums"]["slot_source"];

// New course hierarchy aliases
export type CourseModule          = Database["public"]["Tables"]["course_modules"]["Row"];
export type CourseSession         = Database["public"]["Tables"]["course_sessions"]["Row"];
export type CourseSessionLink     = Database["public"]["Tables"]["course_session_links"]["Row"];
export type CourseSessionDocument = Database["public"]["Tables"]["course_session_documents"]["Row"];
