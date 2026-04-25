const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "mistralai/mistral-7b-instruct";

function headers() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// ── Non-streaming completion ───────────────────────────────────────────

export async function complete(opts: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens: number;
  temperature: number;
}): Promise<string | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        messages: [
          { role: "system", content: opts.system },
          ...opts.messages,
        ],
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

// ── Streaming completion ───────────────────────────────────────────────
// Returns a ReadableStream<Uint8Array> of raw text deltas (plain UTF-8).
// Calls onFinish(fullText) once the stream is exhausted.

export function stream(opts: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens: number;
  temperature: number;
  onFinish: (text: string) => Promise<void>;
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let upstreamRes: Response;

      try {
        upstreamRes = await fetch(ENDPOINT, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            model: MODEL,
            max_tokens: opts.maxTokens,
            temperature: opts.temperature,
            stream: true,
            messages: [
              { role: "system", content: opts.system },
              ...opts.messages,
            ],
          }),
        });
      } catch (err) {
        controller.error(err);
        return;
      }

      if (!upstreamRes.ok || !upstreamRes.body) {
        controller.error(new Error(`OpenRouter error: ${upstreamRes.status}`));
        return;
      }

      const reader = upstreamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") {
              await opts.onFinish(fullText).catch(console.error);
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // skip malformed SSE line
            }
          }
        }

        // Upstream ended without [DONE]
        await opts.onFinish(fullText).catch(console.error);
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
