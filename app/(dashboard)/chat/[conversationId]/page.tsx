"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { createClient } from "@/lib/supabase";
import type { Conversation, Message } from "@/types/database";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Read-only message display for ended conversations ──────────

function ReadOnlyBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (message.is_exit_grounding) {
    return (
      <div className="flex justify-center my-4 px-8">
        <p
          className="text-sm italic text-center leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          {message.content}
        </p>
      </div>
    );
  }

  if (message.is_honest_mirror) {
    return (
      <div className="flex px-4 mb-3">
        <div
          className="max-w-[78%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed"
          style={{
            background: "rgba(123,158,135,0.06)",
            borderLeft: "3px solid rgba(123,158,135,0.5)",
            color: "var(--color-text-primary)",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end px-4 mb-3">
        <div
          className="max-w-[78%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed"
          style={{ background: "var(--color-accent)", color: "white" }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 px-4 mb-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs"
        style={{ background: "rgba(123,158,135,0.12)", color: "#7B9E87" }}
      >
        ✦
      </div>
      <div
        className="max-w-[82%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed"
        style={{
          background: "white",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          color: "var(--color-text-primary)",
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

// ── Ended conversation view ────────────────────────────────────

function EndedView({
  conversation,
  messages,
}: {
  conversation: Conversation;
  messages: Message[];
}) {
  return (
    <div
      className="flex h-[100dvh] flex-col"
      style={{ background: "var(--color-background-warm)" }}
    >
      {/* Header */}
      <header
        className="flex shrink-0 items-center gap-3 border-b px-4 py-3"
        style={{
          borderColor: "rgba(140,134,128,0.12)",
          background: "var(--color-background-warm)",
        }}
      >
        <Link
          href="/conversations"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-black/5"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Back"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 14L6 9l5-5" />
          </svg>
        </Link>
        <span
          className="flex-1 truncate text-sm font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {conversation.title ?? "Conversation"}
        </span>
      </header>

      {/* "Ended" banner */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="shrink-0 flex items-center justify-between gap-3 border-b px-5 py-3"
        style={{
          borderColor: "rgba(140,134,128,0.12)",
          background: "rgba(140,134,128,0.05)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          This was from {formatDate(conversation.started_at)}.{" "}
          Continue where you left off?
        </p>
        <Link
          href={`/chat/new?continueFrom=${conversation.id}`}
          className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-85"
          style={{ background: "var(--color-accent)", color: "white" }}
        >
          Continue →
        </Link>
      </motion.div>

      {/* Message history (read-only) */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[680px] py-6 space-y-1">
          {messages.length === 0 ? (
            <p
              className="text-center text-sm py-16"
              style={{ color: "var(--color-text-muted)" }}
            >
              No messages recorded.
            </p>
          ) : (
            messages.map((m) => <ReadOnlyBubble key={m.id} message={m} />)
          )}
        </div>
      </main>

      {/* Summary if available */}
      {conversation.summary && (
        <div
          className="shrink-0 border-t px-5 py-4"
          style={{ borderColor: "rgba(140,134,128,0.12)" }}
        >
          <p
            className="text-xs font-medium uppercase tracking-widest mb-1.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            Summary
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-primary)" }}>
            {conversation.summary}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function ConversationChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      const [convResult, msgsResult] = await Promise.all([
        db
          .from("conversations")
          .select("*")
          .eq("id", conversationId)
          .eq("user_id", user.id)
          .single(),
        db
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),
      ]);

      if (!convResult.data) {
        router.push("/dashboard");
        return;
      }

      setConversation(convResult.data as Conversation);
      setMessages((msgsResult.data as Message[]) ?? []);
      setLoading(false);
    }

    load();
  }, [conversationId, router]);

  if (loading) {
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

  // Active conversation — hand off to live ChatInterface
  if (!conversation?.ended_at) {
    return <ChatInterface initialConversationId={conversationId} />;
  }

  // Ended conversation — read-only view with banner
  return <EndedView conversation={conversation!} messages={messages} />;
}
