"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { cn } from "@/lib/utils";
import type { UserPatterns } from "@/types";

// ── Typing indicator ──────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 px-4">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs"
        style={{ background: "rgba(123,158,135,0.12)", color: "var(--color-sage)" }}
      >
        ✦
      </div>
      <div
        className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm px-4 py-3.5"
        style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--color-text-muted)" }}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Blinking cursor for streaming ─────────────────────────────
function StreamCursor() {
  return (
    <motion.span
      className="ml-0.5 inline-block h-3.5 w-[2px] rounded-sm align-middle"
      style={{ background: "var(--color-text-muted)" }}
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.85, repeat: Infinity }}
    />
  );
}

// ── Message bubble ────────────────────────────────────────────
interface BubbleProps {
  content: string;
  role: "user" | "assistant";
  isHonestMirror?: boolean;
  isExitGrounding?: boolean;
  isStreaming?: boolean;
}

function MessageBubble({
  content,
  role,
  isHonestMirror,
  isExitGrounding,
  isStreaming,
}: BubbleProps) {
  // Exit grounding — centered, italic, quiet
  if (isExitGrounding && role === "assistant") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="px-8 py-6 text-center"
      >
        <p
          className="text-sm italic leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          {content}
          {isStreaming && <StreamCursor />}
        </p>
      </motion.div>
    );
  }

  // User message — right aligned, amber
  if (role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 8, y: 4 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.22 }}
        className="flex justify-end px-4"
      >
        <div
          className="max-w-[78%] whitespace-pre-wrap rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed"
          style={{ background: "var(--color-accent)", color: "white" }}
        >
          {content}
        </div>
      </motion.div>
    );
  }

  // Honest Mirror — sage left border, tinted card
  if (isHonestMirror) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        className="px-4"
      >
        <div
          className="rounded-2xl border-l-[3px] px-5 py-4 text-sm leading-relaxed"
          style={{
            borderColor: "var(--color-sage)",
            background: "rgba(123,158,135,0.06)",
            color: "var(--color-text-primary)",
          }}
        >
          {content}
          {isStreaming && <StreamCursor />}
        </div>
      </motion.div>
    );
  }

  // Standard AI message — white card
  return (
    <motion.div
      initial={{ opacity: 0, x: -6, y: 4 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex items-end gap-3 px-4"
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs"
        style={{ background: "rgba(123,158,135,0.12)", color: "var(--color-sage)" }}
      >
        ✦
      </div>
      <div
        className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed"
        style={{
          background: "white",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          color: "var(--color-text-primary)",
        }}
      >
        {content}
        {isStreaming && <StreamCursor />}
      </div>
    </motion.div>
  );
}

// ── Growing textarea ──────────────────────────────────────────
function GrowingTextarea({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (value.trim() && !disabled) onSubmit();
        }
      }}
      disabled={disabled}
      rows={1}
      placeholder="What's on your mind?"
      className="w-full resize-none bg-transparent py-2 pr-2 text-sm leading-relaxed outline-none placeholder:text-sm"
      style={{ color: "var(--color-text-primary)" }}
      aria-label="Message input"
    />
  );
}

// ── Main component ────────────────────────────────────────────
interface ChatInterfaceProps {
  initialConversationId?: string;
  initialOpenerMessage?: string;
}

export function ChatInterface({
  initialConversationId,
  initialOpenerMessage,
}: ChatInterfaceProps) {
  const router = useRouter();
  const { user, profile } = useUser();
  const supabase = createClient();

  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  );
  const [conversationTitle, setConversationTitle] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<UserPatterns | null>(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [honestMirrorTriggered, setHonestMirrorTriggered] = useState(false);
  const [isFirstEver, setIsFirstEver] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    messageMeta,
    isLoading,
    error,
    send,
    setInitialMessages,
  } = useStreamingChat({
    conversationId,
    userProfile: profile,
    patterns,
    exchangeCount,
    honestMirrorTriggered,
    isFirstEver,
    currentTopic,
    onConversationCreated: (id) => setConversationId(id),
    onExchangeComplete: (newCount, meta) => {
      setExchangeCount(newCount);
      if (meta.isHonestMirror) setHonestMirrorTriggered(true);
      // Refresh title after second exchange
      if (newCount === 2 && conversationId) {
        setTimeout(refreshTitle, 1500);
      }
    },
  });

  const refreshTitle = useCallback(async () => {
    if (!conversationId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("conversations")
      .select("title")
      .eq("id", conversationId)
      .single();
    if (data?.title) setConversationTitle(data.title);
  }, [conversationId, supabase]);

  // ── Load context + history ─────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      // Patterns
      const { data: p } = await db
        .from("user_patterns")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setPatterns(p ?? null);
      setIsFirstEver((p?.total_conversations ?? 0) === 0);
      setCurrentTopic(profile?.primary_life_area ?? "other");

      // If a pre-generated opener is provided (new conversation), seed it as the first message
      if (!conversationId && initialOpenerMessage) {
        setInitialMessages([
          { id: `opener-${Date.now()}`, role: "assistant", content: initialOpenerMessage },
        ]);
      }

      // Load existing conversation
      if (conversationId) {
        const { data: conv } = await db
          .from("conversations")
          .select("title, exchange_count, honest_mirror_triggered, topic_category")
          .eq("id", conversationId)
          .single();

        if (conv) {
          setConversationTitle(conv.title);
          setExchangeCount(conv.exchange_count);
          setHonestMirrorTriggered(conv.honest_mirror_triggered);
          setCurrentTopic(conv.topic_category);
        }

        // Load message history
        const { data: msgs } = await db
          .from("messages")
          .select("id, role, content, is_honest_mirror, is_exit_grounding")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (msgs && msgs.length > 0) {
          setInitialMessages(
            msgs.map((m: {
              id: string;
              role: "user" | "assistant";
              content: string;
              is_honest_mirror: boolean;
              is_exit_grounding: boolean;
            }) => ({ id: m.id, role: m.role, content: m.content }))
          );
          // Pre-populate metadata for historical messages
          const meta: Record<string, { isHonestMirror: boolean; isExitGrounding: boolean }> = {};
          msgs.forEach((m: { id: string; is_honest_mirror: boolean; is_exit_grounding: boolean }) => {
            if (m.is_honest_mirror || m.is_exit_grounding) {
              meta[m.id] = {
                isHonestMirror: m.is_honest_mirror,
                isExitGrounding: m.is_exit_grounding,
              };
            }
          });
        }
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Auto-scroll ───────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    const text = inputValue;
    setInputValue("");
    send(text);
  };

  const isEmpty = messages.length === 0;
  const lastMsg = messages[messages.length - 1];
  const showTypingIndicator = isLoading && (!lastMsg || lastMsg.role === "user");

  return (
    <div
      className="flex h-[100dvh] flex-col"
      style={{ background: "var(--color-background-warm)" }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className="flex shrink-0 items-center gap-3 border-b px-4 py-3"
        style={{
          borderColor: "rgba(140,134,128,0.12)",
          background: "var(--color-background-warm)",
        }}
      >
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-black/5"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <AnimatePresence mode="wait">
          <motion.span
            key={conversationTitle ?? "loading"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="flex-1 truncate text-sm font-medium capitalize"
            style={{
              color: conversationTitle
                ? "var(--color-text-primary)"
                : "var(--color-text-muted)",
            }}
          >
            {conversationTitle ?? (isEmpty ? "New conversation" : "…")}
          </motion.span>
        </AnimatePresence>
      </header>

      {/* ── Messages ───────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[680px] space-y-4 py-6">

          {/* Empty state */}
          {isEmpty && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="px-8 pt-16 text-center"
            >
              <p
                className="mb-2 text-[1.75rem] font-medium tracking-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                {profile?.display_name
                  ? `Hey, ${profile.display_name.split(" ")[0]}.`
                  : "Hey."}
              </p>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                What&apos;s on your mind?
              </p>
            </motion.div>
          )}

          {/* Messages */}
          {messages.map((m, i) => {
            const meta = messageMeta[m.id] ?? {};
            const isLastAI = m.role === "assistant" && i === messages.length - 1;
            const streaming = isLastAI && isLoading && lastMsg?.role === "assistant";
            return (
              <MessageBubble
                key={m.id}
                content={m.content}
                role={m.role}
                isHonestMirror={meta.isHonestMirror}
                isExitGrounding={meta.isExitGrounding}
                isStreaming={streaming}
              />
            );
          })}

          {/* Typing indicator */}
          <AnimatePresence>
            {showTypingIndicator && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 text-center text-sm"
                style={{ color: "var(--color-clay)" }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} className="h-1" />
        </div>
      </main>

      {/* ── Input ──────────────────────────────────────────── */}
      <div
        className="shrink-0 border-t pb-[env(safe-area-inset-bottom,0px)]"
        style={{
          borderColor: "rgba(140,134,128,0.12)",
          background: "var(--color-background-warm)",
        }}
      >
        <div className="mx-auto flex w-full max-w-[680px] items-end gap-3 px-4 py-3">
          <div
            className={cn(
              "relative flex-1 rounded-2xl border px-4 pb-1 pt-2 transition-colors duration-200",
              isLoading && "opacity-60"
            )}
            style={{
              background: "white",
              borderColor: inputValue
                ? "rgba(201,145,90,0.6)"
                : "rgba(140,134,128,0.18)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <GrowingTextarea
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSend}
              disabled={isLoading}
            />
          </div>

          <motion.button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            whileTap={{ scale: 0.9 }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 disabled:opacity-30"
            style={{
              background: inputValue.trim()
                ? "var(--color-text-primary)"
                : "rgba(140,134,128,0.18)",
            }}
            aria-label="Send message"
          >
            <ArrowUp
              size={18}
              style={{
                color: inputValue.trim()
                  ? "var(--color-background-warm)"
                  : "var(--color-text-muted)",
              }}
            />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
