// Re-export everything from database types
export type {
  Database,
  Json,
  // Column union types
  RelationshipStatus,
  LivingSituation,
  AgeRange,
  PrimaryLifeArea,
  CommunicationStyle,
  TopicCategory,
  MessageRole,
  DetectedTone,
  NudgeFrequency,
  RecurringTopics,
  // Row convenience types
  Profile,
  ProfileInsert,
  ProfileUpdate,
  Conversation,
  ConversationInsert,
  ConversationUpdate,
  Message,
  MessageInsert,
  UserPatterns,
  UserPatternsUpdate,
  NudgeSettings,
  NudgeSettingsUpdate,
} from "./database";

// ─── App-layer types (not stored directly in DB) ──────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  detectedTone?: import("./database").DetectedTone | null;
  isHonestMirror?: boolean;
  isExitGrounding?: boolean;
}

export type ToneAdaptation = {
  tone: import("./database").DetectedTone;
  label: string;
  responseStyle: string;
};

export interface OnboardingState {
  step: number;
  data: Partial<{
    display_name: string;
    gender: string;
    relationship_status: import("./database").RelationshipStatus;
    living_situation: import("./database").LivingSituation;
    age_range: import("./database").AgeRange;
    primary_life_area: import("./database").PrimaryLifeArea;
  }>;
}
