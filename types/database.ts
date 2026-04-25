// ──────────────────────────────────────────────────────────────
// Supabase Database Types
// Auto-kept in sync with lib/database.sql
// ──────────────────────────────────────────────────────────────

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Column union types ────────────────────────────────────────

export type RelationshipStatus =
  | "single"
  | "partnered"
  | "married"
  | "complicated"
  | "prefer not to say";

export type LivingSituation =
  | "alone"
  | "with family"
  | "with partner"
  | "with roommates"
  | "prefer not to say";

export type AgeRange = "18-22" | "23-27" | "28-32" | "33-40";

export type PrimaryLifeArea =
  | "relationships"
  | "career"
  | "self"
  | "family"
  | "everything";

export type CommunicationStyle =
  | "analytical"
  | "emotional"
  | "action-oriented"
  | "reflective";

export type TopicCategory =
  | "relationship"
  | "work"
  | "family"
  | "self-worth"
  | "decision"
  | "conflict"
  | "other";

export type MessageRole = "user" | "assistant";

export type DetectedTone =
  | "aggressive"
  | "sad"
  | "anxious"
  | "confused"
  | "venting"
  | "reflective"
  | "neutral";

export type NudgeFrequency = "daily" | "every2days" | "weekly";

// ─── Recurring topics shape stored in user_patterns.recurring_topics ──
export type RecurringTopics = Record<string, number>;

// ──────────────────────────────────────────────────────────────
// Database type (passed to createClient<Database>)
// ──────────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      // ── profiles ────────────────────────────────────────────
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          gender: string | null;
          relationship_status: RelationshipStatus | null;
          living_situation: LivingSituation | null;
          age_range: AgeRange | null;
          primary_life_area: PrimaryLifeArea | null;
          communication_style: CommunicationStyle | null;
          onboarding_complete: boolean;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          gender?: string | null;
          relationship_status?: RelationshipStatus | null;
          living_situation?: LivingSituation | null;
          age_range?: AgeRange | null;
          primary_life_area?: PrimaryLifeArea | null;
          communication_style?: CommunicationStyle | null;
          onboarding_complete?: boolean;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          gender?: string | null;
          relationship_status?: RelationshipStatus | null;
          living_situation?: LivingSituation | null;
          age_range?: AgeRange | null;
          primary_life_area?: PrimaryLifeArea | null;
          communication_style?: CommunicationStyle | null;
          onboarding_complete?: boolean;
          timezone?: string;
          updated_at?: string;
        };
      };

      // ── conversations ────────────────────────────────────────
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          topic_category: TopicCategory | null;
          started_at: string;
          ended_at: string | null;
          exchange_count: number;
          honest_mirror_triggered: boolean;
          exit_grounding_delivered: boolean;
          summary: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          topic_category?: TopicCategory | null;
          started_at?: string;
          ended_at?: string | null;
          exchange_count?: number;
          honest_mirror_triggered?: boolean;
          exit_grounding_delivered?: boolean;
          summary?: string | null;
        };
        Update: {
          title?: string | null;
          topic_category?: TopicCategory | null;
          ended_at?: string | null;
          exchange_count?: number;
          honest_mirror_triggered?: boolean;
          exit_grounding_delivered?: boolean;
          summary?: string | null;
        };
      };

      // ── messages ─────────────────────────────────────────────
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: MessageRole;
          content: string;
          detected_tone: DetectedTone | null;
          is_honest_mirror: boolean;
          is_exit_grounding: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role: MessageRole;
          content: string;
          detected_tone?: DetectedTone | null;
          is_honest_mirror?: boolean;
          is_exit_grounding?: boolean;
          created_at?: string;
        };
        Update: {
          detected_tone?: DetectedTone | null;
          is_honest_mirror?: boolean;
          is_exit_grounding?: boolean;
        };
      };

      // ── user_patterns ─────────────────────────────────────────
      user_patterns: {
        Row: {
          id: string;
          user_id: string;
          recurring_topics: RecurringTopics;
          recurring_behaviors: string[];
          recurring_emotions: string[];
          last_checkin_topic: string | null;
          last_checkin_question: string | null;
          total_conversations: number;
          last_active: string | null;
          last_computed: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          recurring_topics?: RecurringTopics;
          recurring_behaviors?: string[];
          recurring_emotions?: string[];
          last_checkin_topic?: string | null;
          last_checkin_question?: string | null;
          total_conversations?: number;
          last_active?: string | null;
          last_computed?: string | null;
        };
        Update: {
          recurring_topics?: RecurringTopics;
          recurring_behaviors?: string[];
          recurring_emotions?: string[];
          last_checkin_topic?: string | null;
          last_checkin_question?: string | null;
          total_conversations?: number;
          last_active?: string | null;
          last_computed?: string | null;
        };
      };

      // ── nudge_settings ────────────────────────────────────────
      nudge_settings: {
        Row: {
          id: string;
          user_id: string;
          email_nudge_enabled: boolean;
          nudge_time: string;
          last_nudged: string | null;
          nudge_frequency: NudgeFrequency;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_nudge_enabled?: boolean;
          nudge_time?: string;
          last_nudged?: string | null;
          nudge_frequency?: NudgeFrequency;
        };
        Update: {
          email_nudge_enabled?: boolean;
          nudge_time?: string;
          last_nudged?: string | null;
          nudge_frequency?: NudgeFrequency;
        };
      };
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// ──────────────────────────────────────────────────────────────
// Convenience row types (use these throughout the app)
// ──────────────────────────────────────────────────────────────

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Conversation =
  Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationInsert =
  Database["public"]["Tables"]["conversations"]["Insert"];
export type ConversationUpdate =
  Database["public"]["Tables"]["conversations"]["Update"];

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type MessageInsert =
  Database["public"]["Tables"]["messages"]["Insert"];

export type UserPatterns =
  Database["public"]["Tables"]["user_patterns"]["Row"];
export type UserPatternsUpdate =
  Database["public"]["Tables"]["user_patterns"]["Update"];

export type NudgeSettings =
  Database["public"]["Tables"]["nudge_settings"]["Row"];
export type NudgeSettingsUpdate =
  Database["public"]["Tables"]["nudge_settings"]["Update"];
