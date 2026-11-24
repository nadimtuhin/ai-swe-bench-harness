export interface AgentBenchmarkOptions {
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  /** Abort the agent request (including reading the body) after this many ms. Default 120000. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;

export class AgentEvaluationRunner {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: AgentBenchmarkOptions = {}) {
    this.baseUrl = options.baseUrl || process.env.NINEROUTER_URL || "http://localhost:20128";
    this.apiKey = options.apiKey || process.env.NINEROUTER_KEY || "sk_9router";
    this.model = options.model || "ag/gemini-3.7-flash-low";
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async runTaskPrompt(prompt: string, contextFiles: { path: string; content: string }[]): Promise<{
    rawResponse: string;
    durationMs: number;
    tokensUsed?: number;
  }> {
    const formattedContext = contextFiles
      .map((f) => `### File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join("\n\n");

    const systemPrompt = `You are an elite systems engineer. Solve the following engineering task with minimal, production-grade changes. Do not include conversational fluff. Return clean implementation.`;
    const userMessage = `${formattedContext}\n\n### Task Objective:\n${prompt}`;

    const start = performance.now();
    const signal = AbortSignal.timeout(this.timeoutMs);
    let durationMs: number;
    let rawText: string;
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          temperature: 0.1
        }),
        signal
      });

      durationMs = Math.round(performance.now() - start);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`9Router request failed (${response.status}): ${errText}`);
      }

      rawText = await response.text();
    } catch (err) {
      if (signal.aborted) {
        throw new Error(`9Router request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }

    const { rawResponse, tokensUsed } = parseCompletionBody(rawText);

    return {
      rawResponse,
      durationMs,
      tokensUsed
    };
  }
}

export function parseCompletionBody(rawText: string): { rawResponse: string; tokensUsed?: number } {
  let rawResponse = "";
  let tokensUsed: number | undefined;

  const lines = rawText.split(/\r?\n/);
  const isSse = lines.some((line) => /^data:/.test(line));

  if (!isSse) {
    const data = JSON.parse(rawText);
    return {
      rawResponse: data.choices?.[0]?.message?.content || "",
      tokensUsed: data.usage?.total_tokens
    };
  }

  // Server-sent events: only `data:` fields carry payloads (the space after the colon is optional);
  // comment (":") and other field lines are ignored. `[DONE]` is only a terminator when it is the whole payload.
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    let payload = line.slice(5);
    if (payload.startsWith(" ")) payload = payload.slice(1);
    if (payload.trim() === "[DONE]") break;
    try {
      const parsed = JSON.parse(payload);
      rawResponse += parsed.choices?.[0]?.delta?.content || "";
      if (parsed.usage?.total_tokens) {
        tokensUsed = parsed.usage.total_tokens;
      }
    } catch {
      // Ignore malformed or partial chunks
    }
  }

  return { rawResponse, tokensUsed };
}
