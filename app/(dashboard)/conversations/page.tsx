"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import type { Conversation } from "@/types/database";

const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  relationship: { bg: "rgba(196,132,106,0.12)", color: "#C4846A" },
  work: { bg: "rgba(201,145,90,0.12)", color: "#C9915A" },
  family: { bg: "rgba(123,158,135,0.12)", color: "#7B9E87" },
  "self-worth": { bg: "rgba(140,134,128,0.1)", color: "#8C8680" },
  decision: { bg: "rgba(140,134,128,0.1)", color: "#8C8680" },
  conflict: { bg: "rgba(196,132,106,0.12)", color: "#C4846A" },
  other: { bg: "rgba(140,134,128,0.1)", color: "#8C8680" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getMonthLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function Skeleton({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{ background: "rgba(140,134,128,0.1)" }}
    />
  );
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { data } = await db
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });

      setConversations((data as Conversation[]) ?? []);
      setLoading(false);
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.topic_category?.toLowerCase().includes(q)
    );
  }, [conversations, query]);

  // Group by month
  const grouped = useMemo(() => {
    const groups: { label: string; items: Conversation[] }[] = [];
    const seen = new Map<string, number>();

    for (const conv of filtered) {
      const label = getMonthLabel(conv.started_at);
      if (seen.has(label)) {
        groups[seen.get(label)!].items.push(conv);
      } else {
        seen.set(label, groups.length);
        groups.push({ label, items: [conv] });
      }
    }
    return groups;
  }, [filtered]);

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 md:py-14">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1
          className="text-2xl font-light"
          style={{
            color: "var(--color-text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Conversations
        </h1>
        <Link
          href="/chat"
          className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:opacity-85"
          style={{ background: "var(--color-accent)", color: "white" }}
        >
          New
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          style={{ color: "var(--color-text-muted)" }}
        >
          <circle cx="6" cy="6" r="4.5" />
          <path d="M9.5 9.5l3 3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
            border: "1px solid rgba(140,134,128,0.2)",
          }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-20">
          <p
            className="text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            {query ? "No conversations match that search." : "No conversations yet."}
          </p>
          {!query && (
            <Link
              href="/chat"
              className="mt-4 inline-block text-sm"
              style={{ color: "var(--color-accent)" }}
            >
              Start your first →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ label, items }, gi) => (
            <motion.section
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * gi }}
            >
              <h2
                className="text-xs font-medium uppercase tracking-widest mb-3"
                style={{ color: "var(--color-text-muted)" }}
              >
                {label}
              </h2>
              <div className="space-y-2">
                {items.map((conv) => {
                  const style = conv.topic_category
                    ? (CATEGORY_STYLES[conv.topic_category] ?? CATEGORY_STYLES.other)
                    : null;
                  return (
                    <Link
                      key={conv.id}
                      href={`/conversations/${conv.id}`}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all hover:shadow-sm"
                      style={{ background: "var(--color-surface)" }}
                    >
                      {/* Honest Mirror indicator */}
                      <div className="flex-shrink-0 w-5 flex items-center justify-center">
                        {conv.honest_mirror_triggered && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: "#7B9E87" }}
                            title="Honest Mirror"
                          />
                        )}
                      </div>

                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate mb-1"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {conv.title ?? "Untitled conversation"}
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            {formatDate(conv.started_at)}
                          </span>
                          {style && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                background: style.bg,
                                color: style.color,
                              }}
                            >
                              {conv.topic_category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Exchange count */}
                      <span
                        className="flex-shrink-0 text-xs"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {conv.exchange_count} exchanges
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </div>
      )}
    </div>
  );
}
