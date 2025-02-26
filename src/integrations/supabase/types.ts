export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      generated_content: {
        Row: {
          created_at: string | null
          id: string
          pov: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          style_analysis: Json | null
          tone: string | null
          topic: string
          updated_at: string | null
          user_id: string
          writing_sample: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          pov?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          style_analysis?: Json | null
          tone?: string | null
          topic: string
          updated_at?: string | null
          user_id: string
          writing_sample?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          pov?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          style_analysis?: Json | null
          tone?: string | null
          topic?: string
          updated_at?: string | null
          user_id?: string
          writing_sample?: string | null
        }
        Relationships: []
      }
      linkedin_posts: {
        Row: {
          content: string
          created_at: string | null
          generated_content_id: string | null
          hashtags: string[] | null
          hook: string | null
          id: string
          image_url: string | null
          is_current_version: boolean | null
          news_reference: string | null
          published_at: string | null
          scheduled_for: string | null
          topic: string | null
          updated_at: string | null
          user_id: string
          version_group: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          generated_content_id?: string | null
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          image_url?: string | null
          is_current_version?: boolean | null
          news_reference?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          topic?: string | null
          updated_at?: string | null
          user_id: string
          version_group?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          generated_content_id?: string | null
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          image_url?: string | null
          is_current_version?: boolean | null
          news_reference?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          topic?: string | null
          updated_at?: string | null
          user_id?: string
          version_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_posts_generated_content_id_fkey"
            columns: ["generated_content_id"]
            isOneToOne: false
            referencedRelation: "generated_content"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          industry: string
          published_date: string
          snippet: string | null
          source: string
          title: string
          url: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          industry: string
          published_date: string
          snippet?: string | null
          source: string
          title: string
          url: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          industry?: string
          published_date?: string
          snippet?: string | null
          source?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      post_analytics: {
        Row: {
          clicks: number | null
          comments: number | null
          id: string
          impressions: number | null
          last_updated: string | null
          likes: number | null
          linkedin_post_id: string
          shares: number | null
        }
        Insert: {
          clicks?: number | null
          comments?: number | null
          id?: string
          impressions?: number | null
          last_updated?: string | null
          likes?: number | null
          linkedin_post_id: string
          shares?: number | null
        }
        Update: {
          clicks?: number | null
          comments?: number | null
          id?: string
          impressions?: number | null
          last_updated?: string | null
          likes?: number | null
          linkedin_post_id?: string
          shares?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_analytics_linkedin_post_id_fkey"
            columns: ["linkedin_post_id"]
            isOneToOne: false
            referencedRelation: "linkedin_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_schedules: {
        Row: {
          created_at: string | null
          id: string
          linkedin_post_id: string
          scheduled_time: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          linkedin_post_id: string
          scheduled_time: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          linkedin_post_id?: string
          scheduled_time?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_schedules_linkedin_post_id_fkey"
            columns: ["linkedin_post_id"]
            isOneToOne: false
            referencedRelation: "linkedin_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_sources: {
        Row: {
          created_at: string | null
          id: string
          linkedin_post_id: string
          publication_date: string | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          linkedin_post_id: string
          publication_date?: string | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          linkedin_post_id?: string
          publication_date?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_sources_linkedin_post_id_fkey"
            columns: ["linkedin_post_id"]
            isOneToOne: false
            referencedRelation: "linkedin_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_industries: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          default_pov: string | null
          default_tone: string | null
          industry: string | null
          updated_at: string | null
          user_id: string
          writing_sample: string | null
        }
        Insert: {
          created_at?: string | null
          default_pov?: string | null
          default_tone?: string | null
          industry?: string | null
          updated_at?: string | null
          user_id: string
          writing_sample?: string | null
        }
        Update: {
          created_at?: string | null
          default_pov?: string | null
          default_tone?: string | null
          industry?: string | null
          updated_at?: string | null
          user_id?: string
          writing_sample?: string | null
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
      content_status: "draft" | "scheduled" | "published" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
