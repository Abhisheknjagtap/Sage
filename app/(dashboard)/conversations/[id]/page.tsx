"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import type { Conversation, Message } from "@/types/database";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (message.is_exit_grounding) {
    return (
      <div className="flex justify-center my-4">
        <p
          className="text-sm italic text-center max-w-sm leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          {message.content}
        </p>
      </div>
    );
  }

  if (message.is_honest_mirror) {
    return (
      <div className="flex mb-4">
        <div
          className="max-w-[75%] rounded-2xl px-4 py-3"
          style={{
            background: "rgba(123,158,135,0.06)",
            borderLeft: "3px solid rgba(123,158,135,0.5)",
          }}
        >
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--color-text-primary)" }}
          >
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex mb-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className="max-w-[75%] rounded-2xl px-4 py-3"
        style={
          isUser
            ? {
                background: "var(--color-accent)",
                color: "white",
                borderBottomRightRadius: "6px",
              }
            : {
                background: "var(--color-surface)",
                color: "var(--color-text-primary)",
                borderBottomLeftRadius: "6px",
              }
        }
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

export default function ConversationViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

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
        router.push("/conversations");
        return;
      }

      setConversation(convResult.data as Conversation);
      setMessages((msgsResult.data as Message[]) ?? []);
      setLoading(false);
    }

    load();
  }, [id, router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div
          className="animate-pulse h-6 w-48 rounded-lg mb-8"
          style={{ background: "rgba(140,134,128,0.1)" }}
        />
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`animate-pulse h-14 rounded-2xl ${i % 2 === 0 ? "ml-auto w-2/3" : "w-2/3"}`}
              style={{ background: "rgba(140,134,128,0.1)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 md:py-14">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8"
      >
        <Link
          href="/conversations"
          className="text-sm mb-4 inline-flex items-center gap-1.5 transition-opacity hover:opacity-70"
          style={{ color: "var(--color-text-muted)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 11L5 7l4-4" />
          </svg>
          All conversations
        </Link>

        <h1
          className="text-xl font-medium mt-3 mb-1"
          style={{ color: "var(--color-text-primary)" }}
        >
          {conversation?.title ?? "Untitled conversation"}
        </h1>
        {conversation && (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {formatDate(conversation.started_at)} ·{" "}
            {conversation.exchange_count} exchanges
          </p>
        )}
      </motion.div>

      {/* Messages */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-10"
      >
        {messages.length === 0 ? (
          <p
            className="text-sm text-center py-10"
            style={{ color: "var(--color-text-muted)" }}
          >
            No messages in this conversation.
          </p>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
      </motion.div>

      {/* Continue CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="border-t pt-6 text-center"
        style={{ borderColor: "rgba(140,134,128,0.15)" }}
      >
        <p
          className="text-xs mb-4"
          style={{ color: "var(--color-text-muted)" }}
        >
          This conversation is read-only.
        </p>
        <Link
          href="/chat"
          className="inline-block px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-85"
          style={{ background: "var(--color-accent)", color: "white" }}
        >
          Continue this conversation
        </Link>
      </motion.div>
    </div>
  );
}
