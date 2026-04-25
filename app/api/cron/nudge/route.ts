import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { complete } from "@/lib/openrouter";
import { sendNudgeEmail } from "@/lib/email";
import type { Database, NudgeFrequency } from "@/types/database";

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function isNudgeTimeNow(nudgeTime: string, timezone: string): boolean {
  try {
    const [targetHour] = nudgeTime.split(":").map(Number);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const currentHour = parseInt(
      parts.find((p) => p.type === "hour")?.value ?? "0",
      10
    );
    return currentHour === targetHour;
  } catch {
    return false;
  }
}

function isEligibleByFrequency(
  lastNudged: string | null,
  frequency: NudgeFrequency
): boolean {
  if (!lastNudged) return true;
  const daysSince =
    (Date.now() - new Date(lastNudged).getTime()) / (1000 * 60 * 60 * 24);
  switch (frequency) {
    case "daily":
      return daysSince >= 1;
    case "every2days":
      return daysSince >= 2;
    case "weekly":
      return daysSince >= 7;
  }
}

function isInactiveFor2Days(lastActive: string | null): boolean {
  if (!lastActive) return true;
  const daysSince =
    (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= 2;
}

async function generateNudgeMessage(
  lastCheckinTopic: string | null
): Promise<string> {
  const fallback =
    "It's been a little while — whenever you're ready, I'm here.";

  const result = await complete({
    system:
      "Generate one warm, low-pressure sentence to invite a user back to their AI companion app. If given a recent topic, reference it naturally. No greeting. No preamble. Output only the sentence.",
    messages: [
      {
        role: "user",
        content: lastCheckinTopic
          ? `Recent topic: "${lastCheckinTopic}". Generate nudge message.`
          : "No recent topic. Generate a gentle general check-in nudge.",
      },
    ],
    maxTokens: 60,
    temperature: 0.8,
  });

  return result ?? fallback;
}

// ── Cron handler ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: nudgeSettings, error } = await db
    .from("nudge_settings")
    .select("*")
    .eq("email_nudge_enabled", true);

  if (error) {
    console.error("[nudge] Query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!nudgeSettings?.length) {
    return NextResponse.json({ sent: 0, skipped: 0 });
  }

  const results = { sent: 0, skipped: 0, errors: 0 };

  for (const setting of nudgeSettings) {
    try {
      const { data: profile } = await db
        .from("profiles")
        .select("display_name, timezone")
        .eq("id", setting.user_id)
        .single();

      if (!profile) { results.skipped++; continue; }

      if (!isNudgeTimeNow(setting.nudge_time, profile.timezone)) {
        results.skipped++; continue;
      }

      if (!isEligibleByFrequency(setting.last_nudged, setting.nudge_frequency)) {
        results.skipped++; continue;
      }

      const { data: patterns } = await db
        .from("user_patterns")
        .select("last_active, last_checkin_topic")
        .eq("user_id", setting.user_id)
        .single();

      if (!isInactiveFor2Days(patterns?.last_active ?? null)) {
        results.skipped++; continue;
      }

      const { data: userData } =
        await supabase.auth.admin.getUserById(setting.user_id);
      const email = userData?.user?.email;
      if (!email) { results.skipped++; continue; }

      const nudgeMessage = await generateNudgeMessage(
        patterns?.last_checkin_topic ?? null
      );

      await sendNudgeEmail(email, profile.display_name ?? "there", nudgeMessage);

      await db
        .from("nudge_settings")
        .update({ last_nudged: new Date().toISOString() })
        .eq("id", setting.id);

      results.sent++;
    } catch (err) {
      console.error(`[nudge] Error for user ${setting.user_id}:`, err);
      results.errors++;
    }
  }

  console.log("[nudge] Done:", results);
  return NextResponse.json(results);
}
