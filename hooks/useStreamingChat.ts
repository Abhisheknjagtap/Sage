"use client";


import { supabase } from "@/lib/supabase";
import { useState, useCallback, useRef } from "react";
import type { Profile, UserPatterns } from "@/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface MessageMeta {
  isHonestMirror?: boolean;
  isExitGrounding?: boolean;
  detectedTone?: string;
}

interface UseStreamingChatOptions {
  conversationId: string | null;
  userProfile: Profile | null;
  patterns: UserPatterns | null;
  exchangeCount: number;
  honestMirrorTriggered: boolean;
  isFirstEver: boolean;
  currentTopic: string | null;
  onConversationCreated?: (id: string) => void;
  onExchangeComplete?: (exchangeCount: number, meta: MessageMeta) => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

function detectHonestMirror(text: string): boolean {
  return text.toLowerCase().includes("what i'm actually hearing");
}

function detectExitGrounding(text: string, exchangeCount: number): boolean {
  return (
    exchangeCount >= 8 &&
    text.length < 220 &&
    (text.includes("showed up") ||
      text.includes("you know more") ||
      text.includes("already know") ||
      text.includes("fact that you"))
  );
}

export function useStreamingChat(opts: UseStreamingChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageMeta, setMessageMeta] = useState<Record<string, MessageMeta>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setError(null);
      setIsLoading(true);

      // Optimistically add user message
      const userMsgId = generateId();
      const userMsg: ChatMessage = { id: userMsgId, role: "user", content };
      const aiMsgId = generateId();

      setMessages((prev) => [...prev, userMsg]);

      // Build history for the request (include new user message)
      const historyForRequest = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content },
      ];

      try {
        abortRef.current = new AbortController();

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
  messages: historyForRequest,
}),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        // Read metadata from headers
        const newConvId = response.headers.get("X-Conversation-Id");
        const detectedTone = response.headers.get("X-Detected-Tone") ?? "neutral";

        if (newConvId && !opts.conversationId) {
          opts.onConversationCreated?.(newConvId);
        }

        const data = await response.json();

const aiMsg: ChatMessage = {
  id: aiMsgId,
  role: "assistant",
  content: data.message, // ✅ matches backend
};

setMessages((prev) => [...prev, aiMsg]);

setMessageMeta((prev) => ({
  ...prev,
  [aiMsgId]: {
    detectedTone: "neutral",
    isHonestMirror: false,
    isExitGrounding: false,
  },
}));

opts.onExchangeComplete?.(opts.exchangeCount + 1, {
  detectedTone: "neutral",
});

      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("[useStreamingChat] error:", err);
        setError("Something went quiet. Try again?");
        // Remove optimistic user message on hard failure
        setMessages((prev) => prev.filter((m) => m.id !== userMsgId));
      } finally {
        setIsLoading(false);
      }
    },
    // Opts are included via stable references — caller must memoize if needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, isLoading, opts.conversationId, opts.exchangeCount, opts.honestMirrorTriggered]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const setInitialMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs);
  }, []);

  return {
    messages,
    messageMeta,
    isLoading,
    error,
    send,
    abort,
    setInitialMessages,
  };
}
