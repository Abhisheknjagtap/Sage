"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface ConversationPreview {
  id: string;
  title: string | null;
  topic_category: string | null;
  started_at: string;
  exchange_count: number;
  honest_mirror_triggered: boolean;
  first_message: string | null;
}

interface DashboardData {
  profile: { display_name: string | null };
  patterns: { total_conversations: number } | null;
  checkinQuestion: string;
  conversations: ConversationPreview[];
  insights: string[];
}

const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  relationship: { bg: "rgba(196,132,106,0.12)", color: "#C4846A" },
  work: { bg: "rgba(201,145,90,0.12)", color: "#C9915A" },
  family: { bg: "rgba(123,158,135,0.12)", color: "#7B9E87" },
  "self-worth": { bg: "rgba(140,134,128,0.1)", color: "#8C8680" },
  decision: { bg: "rgba(140,134,128,0.1)", color: "#8C8680" },
  conflict: { bg: "rgba(196,132,106,0.12)", color: "#C4846A" },
  other: { bg: "rgba(140,134,128,0.1)", color: "#8C8680" },
};

function getGreeting(name: string | null | undefined): string {
  const hour = new Date().getHours();
  const firstName = name ?? "there";
  if (hour >= 5 && hour < 12) return `Morning, ${firstName}.`;
  if (hour >= 12 && hour < 17) return `Hey, ${firstName}.`;
  if (hour >= 17 && hour < 22) return `Evening, ${firstName}.`;
  return `Still up, ${firstName}.`;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 30)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
}

function Skeleton({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{ background: "rgba(140,134,128,0.1)" }}
    />
  );
}

function CategoryTag({ category }: { category: string | null }) {
  if (!category) return null;
  const style = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.other;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: style.bg, color: style.color }}
    >
      {category}
    </span>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then(setData)
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const greeting = getGreeting(data?.profile?.display_name);

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 md:py-14">
      {/* Greeting */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="text-3xl md:text-4xl font-light mb-8"
        style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
      >
        {loading ? (
          <Skeleton className="h-10 w-48" />
        ) : (
          greeting
        )}
      </motion.h1>

      {/* ── Section 1: Pattern Check-In ── */}
      <AnimatePresence>
        {loading ? (
          <Skeleton className="h-36 w-full mb-8" />
        ) : data ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            className="rounded-2xl p-6 mb-8"
            style={{ background: "var(--color-surface)" }}
          >
            <p
              className="text-base leading-relaxed mb-5"
              style={{ color: "var(--color-text-primary)" }}
            >
              {data.checkinQuestion}
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/chat"
                className="text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--color-accent)" }}
              >
                Let's talk about it →
              </Link>
              <span
                className="text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                Or start fresh ↓
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── Section 2: Recent Conversations ── */}
      {loading ? (
        <div className="space-y-3 mb-10">
          <Skeleton className="h-4 w-16 mb-4" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : data && data.conversations.length > 0 ? (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="mb-10"
        >
          <h2
            className="text-xs font-medium uppercase tracking-widest mb-4"
            style={{ color: "var(--color-text-muted)" }}
          >
            Recent
          </h2>
          <div className="space-y-2">
            {data.conversations.map((conv, i) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
              >
                <Link
                  href={`/conversations/${conv.id}`}
                  className="block rounded-xl p-4 transition-all hover:shadow-sm"
                  style={{ background: "var(--color-surface)" }}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {conv.honest_mirror_triggered && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: "#7B9E87" }}
                          title="Honest Mirror moment occurred"
                        />
                      )}
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {conv.title ?? "Untitled conversation"}
                      </span>
                    </div>
                    <span
                      className="text-xs flex-shrink-0"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {formatTimeAgo(conv.started_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <CategoryTag category={conv.topic_category} />
                  </div>

                  {conv.first_message && (
                    <p
                      className="text-xs leading-relaxed line-clamp-1"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {conv.first_message.slice(0, 60)}
                      {conv.first_message.length > 60 ? "…" : ""}
                    </p>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="mt-3 text-right">
            <Link
              href="/conversations"
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--color-text-muted)" }}
            >
              View all →
            </Link>
          </div>
        </motion.section>
      ) : null}

      {/* ── Section 3: Insights ── */}
      {!loading && data && data.insights.length > 0 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="mb-10"
        >
          <h2
            className="text-xs font-medium uppercase tracking-widest mb-4"
            style={{ color: "var(--color-text-muted)" }}
          >
            What I've noticed
          </h2>
          <div className="space-y-3">
            {data.insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08 * i }}
                className="rounded-xl p-4"
                style={{
                  background: "rgba(123,158,135,0.07)",
                  borderLeft: "3px solid rgba(123,158,135,0.35)",
                }}
              >
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {insight}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Section 4: Start Fresh ── */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.35 }}
          className="text-center pt-4"
        >
          <Link
            href="/chat"
            className="inline-block px-6 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-85"
            style={{
              background: "var(--color-accent)",
              color: "white",
            }}
          >
            Start a new conversation
          </Link>
          <p
            className="mt-3 text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            No topic too small.
          </p>
        </motion.div>
      )}
    </div>
  );
}
