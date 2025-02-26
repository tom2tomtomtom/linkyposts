
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      linkedin_posts: {
        Row: {
          id: string
          user_id: string
          generated_content_id: string | null
          content: string
          topic: string | null
          version_group: string | null
          is_current_version: boolean
          hashtags: string[] | null
          created_at: string
          updated_at: string
          scheduled_for: string | null
          published_at: string | null
          image_url: string | null
          image_prompt: string | null
        }
        Insert: {
          id?: string
          user_id: string
          generated_content_id?: string | null
          content: string
          topic?: string | null
          version_group?: string | null
          is_current_version?: boolean
          hashtags?: string[] | null
          created_at?: string
          updated_at?: string
          scheduled_for?: string | null
          published_at?: string | null
          image_url?: string | null
          image_prompt?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          generated_content_id?: string | null
          content?: string
          topic?: string | null
          version_group?: string | null
          is_current_version?: boolean
          hashtags?: string[] | null
          created_at?: string
          updated_at?: string
          scheduled_for?: string | null
          published_at?: string | null
          image_url?: string | null
          image_prompt?: string | null
        }
      }
      generated_content: {
        Row: {
          id: string
          user_id: string
          topic: string | null
          tone: string | null
          pov: string | null
          writing_sample: string | null
          style_analysis: Json | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          topic?: string | null
          tone?: string | null
          pov?: string | null
          writing_sample?: string | null
          style_analysis?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic?: string | null
          tone?: string | null
          pov?: string | null
          writing_sample?: string | null
          style_analysis?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          user_id: string
          default_tone: string | null
          default_pov: string | null
          writing_sample: string | null
          industry: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          default_tone?: string | null
          default_pov?: string | null
          writing_sample?: string | null
          industry?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          default_tone?: string | null
          default_pov?: string | null
          writing_sample?: string | null
          industry?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      news_articles: {
        Row: {
          id: string
          title: string
          url: string
          publication_date: string
          source: string
          content: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          url: string
          publication_date: string
          source: string
          content?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          url?: string
          publication_date?: string
          source?: string
          content?: string | null
          created_at?: string
          updated_at?: string
        }
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
  }
}
