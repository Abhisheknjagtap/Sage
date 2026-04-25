import { create } from "zustand";
import type { Conversation, ChatMessage } from "@/types";

interface SessionState {
  currentSession: Conversation | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  exchangeCount: number;
  topicCounts: Record<string, number>;

  setCurrentSession: (session: Conversation | null) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setIsStreaming: (streaming: boolean) => void;
  incrementExchangeCount: () => void;
  incrementTopicCount: (topic: string) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSession: null,
  messages: [],
  isStreaming: false,
  exchangeCount: 0,
  topicCounts: {},

  setCurrentSession: (session) => set({ currentSession: session }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  incrementExchangeCount: () =>
    set((state) => ({ exchangeCount: state.exchangeCount + 1 })),
  incrementTopicCount: (topic) =>
    set((state) => ({
      topicCounts: {
        ...state.topicCounts,
        [topic]: (state.topicCounts[topic] ?? 0) + 1,
      },
    })),
  reset: () =>
    set({
      currentSession: null,
      messages: [],
      isStreaming: false,
      exchangeCount: 0,
      topicCounts: {},
    }),
}));
