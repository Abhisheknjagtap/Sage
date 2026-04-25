import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computePatterns } from "@/lib/patterns";
import type { Database } from "@/types/database";

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  // Vercel Cron sends the secret as a Bearer token
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getAdminClient() as any;

  // Find users with 5+ conversations whose patterns haven't been computed today
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: eligible, error } = await db
    .from("user_patterns")
    .select("user_id")
    .gte("total_conversations", 5)
    .or(
      `last_computed.is.null,last_computed.lt.${todayStart.toISOString()}`
    );

  if (error) {
    console.error("[compute-patterns] Query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also pick up users with 5+ conversations who have no patterns record yet
  const { data: allConvCounts } = await db
    .from("conversations")
    .select("user_id");

  const convCountByUser: Record<string, number> = {};
  for (const row of allConvCounts ?? []) {
    convCountByUser[row.user_id] = (convCountByUser[row.user_id] ?? 0) + 1;
  }

  const eligibleFromPatterns = new Set(
    (eligible ?? []).map((r: { user_id: string }) => r.user_id)
  );

  // Add users with 5+ convs but no patterns record
  for (const [userId, count] of Object.entries(convCountByUser)) {
    if (count >= 5) {
      eligibleFromPatterns.add(userId);
    }
  }

  const userIds = [...eligibleFromPatterns] as string[];

  if (!userIds.length) {
    return NextResponse.json({ processed: 0, message: "No eligible users" });
  }

  const results = { processed: 0, errors: 0 };

  // Process sequentially to avoid hammering the Anthropic API
  for (const userId of userIds) {
    try {
      await computePatterns(userId);
      results.processed++;
    } catch (err) {
      console.error(`[compute-patterns] Failed for user ${userId}:`, err);
      results.errors++;
    }
  }

  console.log(`[compute-patterns] Done:`, results);
  return NextResponse.json(results);
}
