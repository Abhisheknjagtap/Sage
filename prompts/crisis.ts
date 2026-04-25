// ──────────────────────────────────────────────────────────────
// Crisis detection and response.
// This runs synchronously before every AI response — must be fast.
// ──────────────────────────────────────────────────────────────

export const CRISIS_PATTERNS: string[] = [
  // Direct self-harm
  "kill myself",
  "killing myself",
  "hurt myself",
  "hurting myself",
  "cut myself",
  "harm myself",
  "end my life",
  "take my life",
  "end it all",
  "end it",
  // Suicidal ideation
  "suicide",
  "suicidal",
  "want to die",
  "wanna die",
  "wish i was dead",
  "wish i were dead",
  "better off dead",
  "better off without me",
  "no reason to live",
  "not worth living",
  "don't want to be alive",
  "don't want to live",
  "can't go on",
  "can't do this anymore",
  "goodbye forever",
  "final goodbye",
  // Hopelessness markers (high confidence)
  "nothing left to live for",
  "nobody would miss me",
  "everyone would be better off without me",
];

/**
 * Fast local check — no API calls, runs synchronously.
 * Intentionally broad. False positives are handled by the warm response.
 */
export function isCrisisMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return CRISIS_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Warm, present, non-alarming response with crisis resources.
 * Does NOT diagnose, lecture, or pepper with questions.
 */
export function buildCrisisResponse(name?: string): string {
  const opening = name ? `${name},` : "Hey —";

  return `${opening} what you just shared matters. I'm taking it seriously, and I'm glad you said it out loud.

If you're having thoughts of hurting yourself, please reach out right now — these are real people, available right now:

**988 Suicide & Crisis Lifeline** — call or text 988 (free, 24/7)
**Crisis Text Line** — text HOME to 741741

You don't have to be alone with this.

I'm still here.`;
}
