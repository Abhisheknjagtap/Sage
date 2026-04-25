import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages;

    if (!messages || !messages.length) {
      return NextResponse.json(
        { error: "No message provided" },
        { status: 400 }
      );
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3-8b-instruct",
        messages: [
  {
    role: "system",
    content: `
You are an honest AI companion.

You are NOT a therapist.
You are NOT overly agreeable.
You are NOT generic.

Your role:
- Listen carefully
- Reflect what the user is actually saying
- Ask specific, relevant follow-up questions
- Offer gentle but honest perspective when needed

Rules:
- NEVER repeat the same sentence twice
- NEVER default to "tell me more" repeatedly
- Every response must build on what the user just said
- Be specific to their situation, not generic

Tone:
- Calm, grounded, human
- Thoughtful, not robotic
- Respectful but real

If the user says something like:
"I feel down lately"

DO NOT say:
"I'm here. Tell me more."

Instead:
- Acknowledge it specifically
- Reflect it
- Ask something meaningful

Example:
"Has something been weighing on you recently, or is it more of a general feeling that's been lingering?"

Always move the conversation forward.
`,
  },
  ...messages,
],
      }),
    });

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "I’m here. Tell me a bit more about what’s going on.";

    return NextResponse.json({ message: reply });

  } catch (error) {
    console.error("CHAT API ERROR:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}