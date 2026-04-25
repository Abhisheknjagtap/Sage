import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Conversation, Message } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

// GET /api/conversations/[id]
// Returns full conversation + all messages
export async function GET(_request: NextRequest, { params }: Params) {
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

  const [convResult, msgsResult] = await Promise.all([
    db
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    db
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!convResult.data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    conversation: convResult.data as Conversation,
    messages: (msgsResult.data as Message[]) ?? [],
  });
}

// PATCH /api/conversations/[id]
// Body: { title?, ended_at?, summary? }
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    ended_at?: string;
    summary?: string;
  };

  // Strip undefined fields
  const patch: Record<string, string> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.ended_at !== undefined) patch.ended_at = body.ended_at;
  if (body.summary !== undefined) patch.summary = body.summary;

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = await db
    .from("conversations")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ conversation: data as Conversation });
}
