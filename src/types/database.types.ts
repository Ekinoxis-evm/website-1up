export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
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
          }
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
          is_active: boolean | null
          name: string
          payment_link: string | null
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
          is_active?: boolean | null
          name: string
          payment_link?: string | null
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
          is_active?: boolean | null
          name?: string
          payment_link?: string | null
          price_cop?: number | null
          sort_order?: number | null
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
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
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
          }
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
          }
        ]
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

// Convenience type aliases
export type GameCategory = Database["public"]["Tables"]["game_categories"]["Row"]
export type Game         = Database["public"]["Tables"]["games"]["Row"]
export type Player       = Database["public"]["Tables"]["players"]["Row"]
export type Competition  = Database["public"]["Tables"]["competitions"]["Row"]
export type Course       = Database["public"]["Tables"]["courses"]["Row"]
export type PassBenefit  = Database["public"]["Tables"]["pass_benefits"]["Row"]
export type FloorInfo    = Database["public"]["Tables"]["floor_info"]["Row"]
export type Submission   = Database["public"]["Tables"]["recruitment_submissions"]["Row"]
