import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { complete } from "@/lib/openrouter";
import type { Message } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

async function generateSummary(messages: Message[]): Promise<string | null> {
  if (messages.length < 2) return null;

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Companion"}: ${m.content}`)
    .join("\n");

  return complete({
    system:
      "Summarize this conversation in 2 sentences max. Be specific about what was discussed and any insight that emerged. Write in past tense. No preamble, no labels.",
    messages: [{ role: "user", content: transcript }],
    maxTokens: 120,
    temperature: 0.3,
  });
}

async function generateExitGrounding(
  userName: string | null
): Promise<string> {
  const fallback =
    "You showed up. That takes more than it sounds like. Whatever comes next, you already know more than you did.";

  const result = await complete({
    system:
      'Write a 1-2 sentence exit grounding message for someone ending a conversation with their AI companion. It should acknowledge that they showed up, be warm and grounded, not preachy. Start with "You". Do not mention the app.',
    messages: [
      {
        role: "user",
        content: userName
          ? `The user's name is ${userName}.`
          : "Generate exit grounding.",
      },
    ],
    maxTokens: 80,
    temperature: 0.6,
  });

  return result ?? fallback;
}

// POST /api/conversations/[id]/end
export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: conversation } = await db
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (conversation.ended_at) {
    return NextResponse.json({ error: "Already ended" }, { status: 409 });
  }

  const { data: messages } = await db
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const allMessages = (messages as Message[]) ?? [];

  const { data: profile } = await db
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const [summary, exitGroundingText] = await Promise.all([
    generateSummary(allMessages),
    conversation.exit_grounding_delivered
      ? Promise.resolve(null)
      : generateExitGrounding(profile?.display_name ?? null),
  ]);

  const now = new Date().toISOString();

  if (exitGroundingText && !conversation.exit_grounding_delivered) {
    await db.from("messages").insert({
      conversation_id: id,
      user_id: user.id,
      role: "assistant",
      content: exitGroundingText,
      is_honest_mirror: false,
      is_exit_grounding: true,
    });
  }

  await db
    .from("conversations")
    .update({
      ended_at: now,
      ...(summary && { summary }),
      ...(exitGroundingText && { exit_grounding_delivered: true }),
    })
    .eq("id", id);

  await db
    .from("user_patterns")
    .update({ last_active: now })
    .eq("user_id", user.id);

  return NextResponse.json({
    summary,
    exitGrounding: exitGroundingText,
    endedAt: now,
  });
}
