"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { createClient } from "@/lib/supabase";
import type { UserPatterns } from "@/types/database";

// ── Opener generation (client-side, no API cost) ───────────────

function buildOpener(opts: {
  question: string | null;
  firstName: string | null;
  lastTopic: string | null;
  totalConversations: number;
  continueFromTopic: string | null;
  continueFromTitle: string | null;
}): string {
  // Pre-loaded check-in question from the dashboard card
  if (opts.question) return opts.question;

  // Continuing an ended conversation
  if (opts.continueFromTitle || opts.continueFromTopic) {
    const topic = opts.continueFromTopic;
    if (topic) return `Picking up the ${topic} thread — what's changed since then?`;
    return "Let's continue from where you left off. What's on your mind?";
  }

  const hour = new Date().getHours();
  const name = opts.firstName ?? "there";

  // Late night (10pm–5am)
  if (hour >= 22 || hour < 5) return "Late night thoughts?";

  // First conversation ever
  if (opts.totalConversations === 0) return `Hey, ${name}. What's on your mind?`;

  // Returning user — reference last topic if available
  if (opts.lastTopic) {
    const greet = hour < 12 ? "Morning" : hour < 17 ? "Hey" : "Evening";
    return `${greet}. How's the ${opts.lastTopic} situation?`;
  }

  // Generic returning user
  return "What's going on?";
}

// ── Inner component — reads search params ─────────────────────

function NewChatInner() {
  const searchParams = useSearchParams();
  const question = searchParams.get("question");
  const continueFrom = searchParams.get("continueFrom");

  const [opener, setOpener] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function resolve() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      // Fetch user profile for first name
      const { data: profile } = await db
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      // Fetch patterns for total_conversations and last_checkin_topic
      const { data: patterns } = await db
        .from("user_patterns")
        .select("total_conversations, last_checkin_topic")
        .eq("user_id", user.id)
        .single();

      const p = patterns as Pick<
        UserPatterns,
        "total_conversations" | "last_checkin_topic"
      > | null;

      // If continuing from an old conversation, fetch its metadata
      let continueFromTopic: string | null = null;
      let continueFromTitle: string | null = null;

      if (continueFrom) {
        const { data: oldConv } = await db
          .from("conversations")
          .select("title, topic_category")
          .eq("id", continueFrom)
          .eq("user_id", user.id)
          .single();

        if (oldConv) {
          continueFromTopic = oldConv.topic_category ?? null;
          continueFromTitle = oldConv.title ?? null;
        }
      }

      const openerText = buildOpener({
        question,
        firstName: profile?.display_name ?? null,
        lastTopic: p?.last_checkin_topic ?? null,
        totalConversations: p?.total_conversations ?? 0,
        continueFromTopic,
        continueFromTitle,
      });

      setOpener(openerText);
    }

    resolve();
  }, [question, continueFrom]);

  // Don't render ChatInterface until we have the opener
  // (avoids flash of static empty state before opener resolves)
  if (opener === null) {
    return (
      <div
        className="flex h-[100dvh] items-center justify-center"
        style={{ background: "var(--color-background-warm)" }}
      >
        <div
          className="h-1.5 w-1.5 animate-ping rounded-full"
          style={{ background: "var(--color-text-muted)" }}
        />
      </div>
    );
  }

  return <ChatInterface initialOpenerMessage={opener} />;
}

// ── Page — wraps in Suspense for useSearchParams ──────────────

export default function NewChatPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex h-[100dvh] items-center justify-center"
          style={{ background: "var(--color-background-warm)" }}
        >
          <div
            className="h-1.5 w-1.5 animate-ping rounded-full"
            style={{ background: "var(--color-text-muted)" }}
          />
        </div>
      }
    >
      <NewChatInner />
    </Suspense>
  );
}
