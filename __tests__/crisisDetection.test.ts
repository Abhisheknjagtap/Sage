import {
  isCrisisMessage,
  buildCrisisResponse,
  CRISIS_PATTERNS,
} from "@/prompts/crisis";

describe("isCrisisMessage", () => {
  describe("unsafe messages — should return true", () => {
    test.each([
      ["kill myself", "I want to kill myself"],
      ["suicide", "I've been thinking about suicide lately"],
      ["want to die", "I just want to die and be done with it"],
      ["end my life", "I keep thinking about how to end my life"],
      ["better off without me", "everyone would be better off without me"],
      ["nobody would miss me", "nobody would miss me if I was gone"],
      ["can't go on", "I can't go on like this anymore"],
      ["wish i was dead", "I wish I was dead honestly"],
      ["hurt myself", "I've been hurting myself again"],
      ["no reason to live", "there's no reason to live"],
    ])("%s", (_, message) => {
      expect(isCrisisMessage(message)).toBe(true);
    });
  });

  describe("safe messages — should return false", () => {
    test.each([
      ["regular venting", "I'm so frustrated with my boss today"],
      ["hyperbole", "this project is literally killing me"],
      ["sleep talk", "I'm dead tired after that workout"],
      ["past tense context", "I talked to a therapist about my dark thoughts"],
      ["third person", "my friend is worried about their mental health"],
      ["general sadness", "I feel really low and empty today"],
    ])("%s", (_, message) => {
      expect(isCrisisMessage(message)).toBe(false);
    });
  });

  test("is case-insensitive", () => {
    expect(isCrisisMessage("I WANT TO KILL MYSELF")).toBe(true);
    expect(isCrisisMessage("Suicide Is On My Mind")).toBe(true);
  });
});

describe("buildCrisisResponse", () => {
  test("includes 988 lifeline", () => {
    expect(buildCrisisResponse()).toContain("988");
  });

  test("includes Crisis Text Line", () => {
    expect(buildCrisisResponse()).toContain("741741");
  });

  test("uses name when provided", () => {
    const response = buildCrisisResponse("Alex");
    expect(response).toMatch(/^Alex,/);
  });

  test("uses generic opener without name", () => {
    const response = buildCrisisResponse();
    expect(response).toMatch(/^Hey/);
  });

  test("does not end conversation — affirms presence", () => {
    expect(buildCrisisResponse()).toContain("still here");
  });
});

describe("CRISIS_PATTERNS", () => {
  test("has at least 20 patterns", () => {
    expect(CRISIS_PATTERNS.length).toBeGreaterThanOrEqual(20);
  });

  test("all patterns are lowercase strings", () => {
    for (const p of CRISIS_PATTERNS) {
      expect(typeof p).toBe("string");
      expect(p).toBe(p.toLowerCase());
    }
  });
});
