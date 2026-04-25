import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { complete } from "@/lib/openrouter";
import type {
  Database,
  Profile,
  UserPatterns,
  Conversation,
} from "@/types/database";

export interface ConversationWithPreview extends Conversation {
  first_message: string | null;
}

export interface DashboardData {
  profile: Profile;
  patterns: UserPatterns | null;
  checkinQuestion: string;
  conversations: ConversationWithPreview[];
  insights: string[];
}

async function generateCheckinQuestion(
  patterns: UserPatterns | null
): Promise<string> {
  const fallback = "What's been taking up the most space in your head lately?";

  if (!patterns || patterns.total_conversations < 2) return fallback;

  const topic = patterns.last_checkin_topic;
  if (!topic) return fallback;

  const result = await complete({
    system:
      "You are a warm, direct AI companion. Generate ONE short check-in question (max 15 words) referencing the user's recent conversation topic. Sound natural and human. Output only the question, nothing else.",
    messages: [
      {
        role: "user",
        content: `The user's last main conversation topic was: "${topic}". Generate a check-in question.`,
      },
    ],
    maxTokens: 60,
    temperature: 0.7,
  });

  return result ?? "How's that situation sitting with you this week?";
}

async function generateInsights(behaviors: string[]): Promise<string[]> {
  if (!behaviors.length) return [];

  const result = await complete({
    system:
      'Convert each behavior pattern into a 1-2 sentence warm observation starting with "You". Sound human and gently honest, not clinical or therapeutic. One observation per line, no blank lines.',
    messages: [
      {
        role: "user",
        content: `Behaviors:\n${behaviors.slice(0, 3).join("\n")}`,
      },
    ],
    maxTokens: 300,
    temperature: 0.6,
  });

  if (!result) return [];

  return result
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("You"))
    .slice(0, 3);
}

export async function GET() {
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [profileResult, patternsResult, conversationsResult] =
    await Promise.all([
      db.from("profiles").select("*").eq("id", user.id).single(),
      db.from("user_patterns").select("*").eq("user_id", user.id).single(),
      db
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(5),
    ]);

  const profile = profileResult.data as Profile | null;
  const patterns = patternsResult.data as UserPatterns | null;
  const conversations = (conversationsResult.data ?? []) as Conversation[];

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const conversationsWithPreviews = await Promise.all(
    conversations.map(async (conv) => {
      const { data: firstMsg } = await db
        .from("messages")
        .select("content")
        .eq("conversation_id", conv.id)
        .eq("role", "user")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      return {
        ...conv,
        first_message: (firstMsg?.content as string | null) ?? null,
      } as ConversationWithPreview;
    })
  );

  const showInsights =
    patterns !== null && patterns.total_conversations >= 5;

  const [checkinQuestion, insights] = await Promise.all([
    generateCheckinQuestion(patterns),
    showInsights
      ? generateInsights(patterns!.recurring_behaviors ?? [])
      : Promise.resolve([]),
  ]);

  const data: DashboardData = {
    profile,
    patterns,
    checkinQuestion,
    conversations: conversationsWithPreviews,
    insights,
  };

  return NextResponse.json(data);
}
