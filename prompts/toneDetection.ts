import { complete } from "@/lib/openrouter";

const VALID_TONES = [
  "aggressive",
  "sad",
  "anxious",
  "confused",
  "venting",
  "reflective",
  "neutral",
] as const;

export type DetectedToneValue = (typeof VALID_TONES)[number];

/**
 * Classifies the emotional tone of a user message.
 * Uses fast local heuristics first, then OpenRouter as fallback.
 * Falls back to "neutral" on any error.
 */
export async function detectTone(message: string): Promise<DetectedToneValue> {
  if (!message.trim()) return "neutral";

  const lower = message.toLowerCase();
  if (local_isAggressive(lower)) return "aggressive";
  if (local_isSad(lower)) return "sad";
  if (local_isAnxious(lower)) return "anxious";

  const raw = await complete({
    system: `Classify the emotional tone of this message as exactly one word.

Choose from: aggressive | sad | anxious | confused | venting | reflective | neutral

Rules:
- "venting" = expressing frustration/anger about a situation, telling a story with emotion
- "aggressive" = directly hostile, confrontational, or attacking
- "anxious" = worried, overthinking, spiraling, what-ifs
- "sad" = grief, loss, low energy, hopeless tone
- "confused" = genuinely lost, unclear, uncertain about facts/situation
- "reflective" = thoughtful, calm, introspective, philosophical
- "neutral" = factual, calm, no strong emotion

Respond with only the single word.`,
    messages: [{ role: "user", content: JSON.stringify(message.slice(0, 500)) }],
    maxTokens: 8,
    temperature: 0,
  });

  const tone = raw?.toLowerCase().trim() ?? "neutral";
  return (VALID_TONES as readonly string[]).includes(tone)
    ? (tone as DetectedToneValue)
    : "neutral";
}

// ── Local fast-path heuristics ─────────────────────────────────

function local_isAggressive(msg: string): boolean {
  const signals = [
    "wtf", "fuck", "shut up", "you're wrong", "that's stupid",
    "idiot", "this is bullshit", "screw this", "i hate",
  ];
  return signals.some((s) => msg.includes(s));
}

function local_isSad(msg: string): boolean {
  const signals = [
    "i can't stop crying", "i feel so alone", "nobody cares",
    "i give up", "what's the point", "i'm so tired of",
    "nothing ever gets better", "i feel empty",
  ];
  return signals.some((s) => msg.includes(s));
}

function local_isAnxious(msg: string): boolean {
  const signals = [
    "what if", "i keep thinking", "i can't stop worrying",
    "what's going to happen", "i'm scared that", "what do i do",
    "i don't know what to do", "i can't decide",
  ];
  return signals.some((s) => msg.includes(s));
}
