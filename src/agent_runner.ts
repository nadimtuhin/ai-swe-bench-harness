export interface AgentBenchmarkOptions {
  model?: string;
  baseUrl?: string;
  apiKey?: string;
}

export class AgentEvaluationRunner {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options: AgentBenchmarkOptions = {}) {
    this.baseUrl = options.baseUrl || process.env.NINEROUTER_URL || "http://localhost:20128";
    this.apiKey = options.apiKey || process.env.NINEROUTER_KEY || "sk_9router";
    this.model = options.model || "ag/gemini-3.7-flash-low";
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
      })
    });

    const durationMs = Math.round(performance.now() - start);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`9Router request failed (${response.status}): ${errText}`);
    }

    const rawText = await response.text();
    let rawResponse = "";
    let tokensUsed: number | undefined;

    // Handle SSE chunked streaming or standard JSON response from 9Router
    if (rawText.startsWith("data:")) {
      const lines = rawText.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ") && !line.includes("[DONE]")) {
          try {
            const parsed = JSON.parse(line.slice(6));
            const deltaContent = parsed.choices?.[0]?.delta?.content || "";
            rawResponse += deltaContent;
            if (parsed.usage?.total_tokens) {
              tokensUsed = parsed.usage.total_tokens;
            }
          } catch {
            // Ignore parse errors on trailing chunks
          }
        }
      }
    } else {
      const data = JSON.parse(rawText);
      rawResponse = data.choices?.[0]?.message?.content || "";
      tokensUsed = data.usage?.total_tokens;
    }

    return {
      rawResponse,
      durationMs,
      tokensUsed
    };
  }
}
