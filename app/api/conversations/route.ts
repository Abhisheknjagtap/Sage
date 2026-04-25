import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Conversation } from "@/types/database";

const PAGE_SIZE = 20;

// GET /api/conversations?page=1
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [countResult, listResult] = await Promise.all([
    db
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    db
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
  ]);

  const total = (countResult.count as number) ?? 0;

  return NextResponse.json({
    conversations: (listResult.data as Conversation[]) ?? [],
    total,
    page,
    hasMore: offset + PAGE_SIZE < total,
  });
}

// POST /api/conversations
// Body: { topic_category? }
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    topic_category?: string;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = await db
    .from("conversations")
    .insert({
      user_id: user.id,
      topic_category: body.topic_category ?? "other",
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create conversation" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id as string }, { status: 201 });
}
