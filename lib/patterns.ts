import { createClient } from "@supabase/supabase-js";
import { complete } from "@/lib/openrouter";
import type { Database, CommunicationStyle } from "@/types/database";

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ── Communication style inference (heuristic, no API cost) ────────────

function inferCommunicationStyle(messages: string[]): CommunicationStyle {
  const allText = messages.join(" ");
  const avgWords =
    messages.reduce((sum, m) => sum + m.split(/\s+/).length, 0) /
    messages.length;

  const emotionalMatches =
    allText.match(
      /\b(feel|feeling|felt|hurt|scared|overwhelmed|sad|angry|happy|love|hate|fear|anxious|worried|excited|devastated|relieved|frustrated)\b/gi
    )?.length ?? 0;

  const analyticalMatches =
    allText.match(
      /\b(because|therefore|however|although|considering|analyze|understand|reason|logic|think|believe|evidence|actually|objectively|perspective)\b/gi
    )?.length ?? 0;

  const actionMatches =
    allText.match(
      /\b(do|done|make|need|want|must|should|going|plan|step|fix|solve|goal|decide|action|move|change)\b/gi
    )?.length ?? 0;

  if (avgWords < 18) return "action-oriented";

  const max = Math.max(emotionalMatches, analyticalMatches, actionMatches);
  if (max === 0) return "reflective";
  if (max === emotionalMatches) return "emotional";
  if (max === analyticalMatches) return "analytical";
  if (max === actionMatches) return "action-oriented";
  return "reflective";
}

// ── Behavioral pattern extraction ─────────────────────────────────────

async function extractBehaviors(messages: string[]): Promise<string[]> {
  if (messages.length < 3) return [];

  const excerpt = messages
    .slice(0, 20)
    .map((text, i) => `[${i + 1}] ${text}`)
    .join("\n");

  const raw = await complete({
    system:
      "Based on these messages from one person across multiple conversations, identify 3-5 recurring behavioral or emotional patterns. Be specific and observational, not clinical. Examples: 'tends to minimize their own role in conflicts', 'seeks external validation before trusting own instincts', 'shows strong self-awareness after initial venting'. Return as JSON array of strings only. No markdown, no explanation.",
    messages: [{ role: "user", content: excerpt }],
    maxTokens: 500,
    temperature: 0.3,
  });

  if (!raw) return [];

  try {
    const cleaned = raw
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

// ── Main pattern computation ───────────────────────────────────────────

export async function computePatterns(userId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getAdminClient() as any;

  const { data: conversations, error: convError } = await db
    .from("conversations")
    .select("id, topic_category")
    .eq("user_id", userId);

  if (convError || !conversations?.length) return;

  const recurringTopics: Record<string, number> = {};
  for (const conv of conversations) {
    if (conv.topic_category) {
      recurringTopics[conv.topic_category] =
        (recurringTopics[conv.topic_category] ?? 0) + 1;
    }
  }

  const { data: rawMessages } = await db
    .from("messages")
    .select("content")
    .eq("user_id", userId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(20);

  const messageTexts: string[] = (rawMessages ?? [])
    .map((m: { content: string }) => m.content)
    .reverse();

  const lastCheckinTopic =
    Object.entries(recurringTopics).sort(([, a], [, b]) => b - a)[0]?.[0] ??
    null;

  const recurringBehaviors = await extractBehaviors(messageTexts);

  await db.from("user_patterns").upsert(
    {
      user_id: userId,
      recurring_topics: recurringTopics,
      recurring_behaviors: recurringBehaviors,
      total_conversations: conversations.length,
      last_checkin_topic: lastCheckinTopic,
      last_active: new Date().toISOString(),
      last_computed: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (messageTexts.length >= 5) {
    const style = inferCommunicationStyle(messageTexts);
    await db
      .from("profiles")
      .update({ communication_style: style })
      .eq("id", userId);
  }
}

// ── Check-in question generation ───────────────────────────────────────

export async function generateCheckinQuestion(
  userId: string
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getAdminClient() as any;

  const fallback = "What's been taking up the most space in your head lately?";

  const { data: patterns } = await db
    .from("user_patterns")
    .select("last_checkin_topic, last_checkin_question")
    .eq("user_id", userId)
    .single();

  if (!patterns?.last_checkin_topic) return fallback;

  const question = await complete({
    system:
      "You are a warm, direct AI companion. Generate ONE check-in question (max 15 words) referencing the user's recent conversation topic. Sound natural, not clinical. Output only the question.",
    messages: [
      {
        role: "user",
        content: `Last topic: "${patterns.last_checkin_topic}". Generate a check-in question.`,
      },
    ],
    maxTokens: 60,
    temperature: 0.7,
  });

  if (!question) return fallback;

  await db
    .from("user_patterns")
    .update({ last_checkin_question: question })
    .eq("user_id", userId);

  return question;
}
