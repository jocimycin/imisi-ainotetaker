// types/database.ts — generated from Supabase schema
// Run: supabase gen types typescript --local > types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          plan: 'free' | 'pro' | 'team'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      integrations: {
        Row: {
          id: string
          user_id: string
          provider: 'google' | 'microsoft' | 'zoom' | 'zoho'
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          scopes: string[]
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['integrations']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['integrations']['Insert']>
      }
      meetings: {
        Row: {
          id: string
          user_id: string
          title: string | null
          platform: 'zoom' | 'teams' | 'meet' | 'zoho' | 'other'
          platform_meeting_id: string | null
          join_url: string | null
          bot_id: string | null
          status: 'scheduled' | 'joining' | 'live' | 'processing' | 'complete' | 'failed'
          started_at: string | null
          ended_at: string | null
          duration_seconds: number | null
          attendees: Json
          recording_url: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['meetings']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['meetings']['Insert']>
      }
      transcripts: {
        Row: {
          id: string
          meeting_id: string
          raw_text: string | null
          segments: TranscriptSegment[]
          word_count: number | null
          language: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['transcripts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['transcripts']['Insert']>
      }
      summaries: {
        Row: {
          id: string
          meeting_id: string
          tldr: string | null
          key_points: string[]
          decisions: Decision[]
          topics: string[]
          sentiment: 'positive' | 'neutral' | 'negative' | null
          model_used: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['summaries']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['summaries']['Insert']>
      }
      action_items: {
        Row: {
          id: string
          meeting_id: string
          user_id: string
          text: string
          assignee_name: string | null
          assignee_email: string | null
          due_date: string | null
          status: 'open' | 'in_progress' | 'done'
          priority: 'low' | 'medium' | 'high'
          source_quote: string | null
          external_task_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['action_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['action_items']['Insert']>
      }
      email_logs: {
        Row: {
          id: string
          meeting_id: string | null
          recipient_email: string
          status: 'sent' | 'failed' | 'bounced'
          sent_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['email_logs']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['email_logs']['Insert']>
      }
    }
  }
}

// Shared nested types
export interface TranscriptSegment {
  speaker: string
  text: string
  start_ms: number
  end_ms: number
}

export interface Decision {
  decision: string
  context: string
}

export interface Attendee {
  name: string
  email: string | null
}

// Convenience row types
export type Meeting = Database['public']['Tables']['meetings']['Row']
export type Transcript = Database['public']['Tables']['transcripts']['Row']
export type Summary = Database['public']['Tables']['summaries']['Row']
export type ActionItem = Database['public']['Tables']['action_items']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Integration = Database['public']['Tables']['integrations']['Row']
