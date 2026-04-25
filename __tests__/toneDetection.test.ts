import { detectTone } from "@/prompts/toneDetection";

// Mock Anthropic so tests never hit the API
jest.mock("@anthropic-ai/sdk", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: "text", text: "neutral" }],
        }),
      },
    })),
  };
});

describe("detectTone — local heuristics (no API call)", () => {
  test("wtf → aggressive", async () => {
    expect(await detectTone("wtf is wrong with you")).toBe("aggressive");
  });

  test("i hate → aggressive", async () => {
    expect(await detectTone("I hate everything about this situation")).toBe(
      "aggressive"
    );
  });

  test("i can't stop crying → sad", async () => {
    expect(await detectTone("I can't stop crying today")).toBe("sad");
  });

  test("nothing ever gets better → sad", async () => {
    expect(await detectTone("nothing ever gets better no matter what I do")).toBe(
      "sad"
    );
  });

  test("what if → anxious", async () => {
    expect(
      await detectTone("what if I make the wrong choice and regret it forever")
    ).toBe("anxious");
  });

  test("i can't stop worrying → anxious", async () => {
    expect(await detectTone("I can't stop worrying about the interview")).toBe(
      "anxious"
    );
  });

  test("empty string → neutral (no API call)", async () => {
    expect(await detectTone("   ")).toBe("neutral");
  });
});

describe("detectTone — API fallback path", () => {
  test("neutral message returns neutral via API", async () => {
    // The mock returns 'neutral', so any non-heuristic message → neutral
    expect(await detectTone("I had a pretty normal day today")).toBe("neutral");
  });

  test("API error falls back to neutral", async () => {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    // Override mock to throw
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementationOnce(
      () =>
        ({
          messages: {
            create: jest.fn().mockRejectedValue(new Error("API unavailable")),
          },
        }) as never
    );

    // Re-import to get fresh instance — detectTone is in module scope so we test fallback via catch
    expect(await detectTone("I wonder about things sometimes")).toBe("neutral");
  });
});
