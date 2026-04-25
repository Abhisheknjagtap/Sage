// ── Mocks must be declared before imports (jest.mock is hoisted) ────────

jest.mock("@anthropic-ai/sdk", () => {
  const mockCreate = jest.fn();
  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
  (MockAnthropic as unknown as Record<string, unknown>).__mockCreate = mockCreate;
  return { __esModule: true, default: MockAnthropic };
});

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

// ── Imports ─────────────────────────────────────────────────────────────

import { computePatterns, generateCheckinQuestion } from "@/lib/patterns";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// Retrieve the shared mock from the module-level factory
const anthropicCreate = (
  Anthropic as unknown as Record<string, jest.Mock>
).__mockCreate as jest.Mock;

// ── Helpers ──────────────────────────────────────────────────────────────

function buildDb({
  conversations = [] as Array<{ id: string; topic_category: string | null }>,
  messages = [] as Array<{ content: string }>,
  patterns = null as {
    last_checkin_topic: string | null;
    last_checkin_question: string | null;
  } | null,
} = {}) {
  return {
    from: jest.fn((table: string) => {
      if (table === "conversations") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: conversations,
              error: null,
            }),
          }),
        };
      }
      if (table === "messages") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: messages }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "user_patterns") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: patterns }),
            }),
          }),
          upsert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({}),
          }),
        };
      }
      if (table === "profiles") {
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({}),
          }),
        };
      }
      return {};
    }),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("computePatterns", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  });

  test("returns early when user has no conversations", async () => {
    (createClient as jest.Mock).mockReturnValue(buildDb({ conversations: [] }));
    await expect(computePatterns("user-1")).resolves.toBeUndefined();
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  test("upserts user_patterns after computing topics", async () => {
    const db = buildDb({
      conversations: [
        { id: "c1", topic_category: "work" },
        { id: "c2", topic_category: "work" },
        { id: "c3", topic_category: "relationship" },
      ],
      messages: [
        { content: "stressed about deadlines" },
        { content: "boss keeps changing requirements" },
        { content: "maybe i'm not cut out for this" },
      ],
    });
    (createClient as jest.Mock).mockReturnValue(db);

    anthropicCreate.mockResolvedValue({
      content: [
        { type: "text", text: '["tends to self-doubt under pressure"]' },
      ],
    });

    await computePatterns("user-2");

    const touchedPatterns = db.from.mock.calls.some(
      ([t]: [string]) => t === "user_patterns"
    );
    expect(touchedPatterns).toBe(true);
  });

  test("handles malformed JSON from Claude without throwing", async () => {
    (createClient as jest.Mock).mockReturnValue(
      buildDb({
        conversations: [{ id: "c1", topic_category: "self-worth" }],
        messages: [
          { content: "i feel like a failure" },
          { content: "nothing works" },
          { content: "why bother" },
        ],
      })
    );

    anthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "not valid json" }],
    });

    await expect(computePatterns("user-3")).resolves.toBeUndefined();
  });
});

describe("generateCheckinQuestion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  });

  test("returns fallback when no patterns row exists", async () => {
    (createClient as jest.Mock).mockReturnValue(buildDb({ patterns: null }));
    const q = await generateCheckinQuestion("user-1");
    expect(typeof q).toBe("string");
    expect(q.length).toBeGreaterThan(0);
  });

  test("returns fallback when no last_checkin_topic", async () => {
    (createClient as jest.Mock).mockReturnValue(
      buildDb({
        patterns: { last_checkin_topic: null, last_checkin_question: null },
      })
    );
    const q = await generateCheckinQuestion("user-1");
    expect(q).toContain("space in your head");
  });

  test("returns AI-generated question for known topic", async () => {
    (createClient as jest.Mock).mockReturnValue(
      buildDb({
        patterns: { last_checkin_topic: "work", last_checkin_question: null },
      })
    );

    anthropicCreate.mockResolvedValue({
      content: [
        { type: "text", text: "How's the work situation since we last talked?" },
      ],
    });

    const q = await generateCheckinQuestion("user-2");
    expect(q).toBe("How's the work situation since we last talked?");
  });

  test("returns fallback on API error", async () => {
    (createClient as jest.Mock).mockReturnValue(
      buildDb({
        patterns: { last_checkin_topic: "family", last_checkin_question: null },
      })
    );

    anthropicCreate.mockRejectedValue(new Error("network error"));

    const q = await generateCheckinQuestion("user-3");
    expect(typeof q).toBe("string");
    expect(q.length).toBeGreaterThan(5);
  });
});
