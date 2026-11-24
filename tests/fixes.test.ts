import { describe, expect, it } from "bun:test";
import { AgentEvaluationRunner, parseCompletionBody } from "../src/agent_runner";
import { EvaluationEngine } from "../src/engine";
import { BenchmarkTaskSchema, type BenchmarkTask } from "../src/types";

function makeTask(gates: BenchmarkTask["verificationGates"], taskId = "T-1"): BenchmarkTask {
  return BenchmarkTaskSchema.parse({
    taskId,
    title: "t",
    domain: "database_storage",
    workflow: "refactoring",
    difficulty: "senior",
    prompt: "p",
    targetFiles: [],
    verificationGates: gates
  });
}

const gate = (id: string, command = `run ${id}`) => ({
  id,
  name: id,
  type: "deterministic_test" as const,
  command,
  threshold: 1.0,
  weight: 1.0
});

describe("scoring integrity", () => {
  it("does not mark a task with zero verification gates as passed", async () => {
    const engine = new EvaluationEngine();
    engine.registerTask(makeTask([]));
    const report = await engine.runAudit("T-1", async () => ({ passed: true, score: 1 }));
    expect(report.passed).toBe(false);
    expect(report.compositeScore).toBe(0);
  });

  it("records a throwing gate executor as a failed gate instead of aborting the run", async () => {
    const engine = new EvaluationEngine();
    engine.registerTask(makeTask([gate("ok"), gate("boom")], "T-1"));
    engine.registerTask(makeTask([gate("ok2")], "T-2"));

    const summary = await engine.runAll(async (cmd) => {
      if (cmd.includes("boom")) throw new Error("gate timed out");
      return { passed: true, score: 1 };
    });

    expect(summary.totalTasks).toBe(2);
    const t1 = summary.tasks.find((t) => t.taskId === "T-1")!;
    expect(t1.passed).toBe(false);
    const boom = t1.gateResults.find((g) => g.gateId === "boom")!;
    expect(boom.passed).toBe(false);
    expect(boom.score).toBe(0);
    expect(boom.stderr).toContain("gate timed out");
    expect(summary.tasks.find((t) => t.taskId === "T-2")!.passed).toBe(true);
  });

  it("treats non-finite or out-of-range scores as 0 so they cannot poison or inflate the composite", async () => {
    const engine = new EvaluationEngine();
    engine.registerTask(makeTask([gate("nan"), gate("big"), gate("ok")]));
    const report = await engine.runAudit("T-1", async (cmd) => {
      if (cmd.includes("nan")) return { passed: true, score: Number.NaN };
      if (cmd.includes("big")) return { passed: true, score: 100 };
      return { passed: true, score: 1 };
    });
    expect(Number.isFinite(report.compositeScore)).toBe(true);
    expect(report.compositeScore).toBeLessThanOrEqual(1);
    expect(report.passed).toBe(false);
  });
});

describe("agent response parsing", () => {
  it("parses SSE streams that start with a comment/event line or use 'data:' without a space", () => {
    const body = [
      ": keep-alive",
      "",
      'data:{"choices":[{"delta":{"content":"Hello "}}]}',
      "",
      'data: {"choices":[{"delta":{"content":"world"}}],"usage":{"total_tokens":7}}',
      "",
      "data: [DONE]",
      ""
    ].join("\r\n");
    const res = parseCompletionBody(body);
    expect(res.rawResponse).toBe("Hello world");
    expect(res.tokensUsed).toBe(7);
  });

  it("keeps SSE content chunks whose text contains the literal [DONE]", () => {
    const body = [
      'data: {"choices":[{"delta":{"content":"status: [DONE] "}}]}',
      'data: {"choices":[{"delta":{"content":"ok"}}]}',
      "data: [DONE]"
    ].join("\n");
    expect(parseCompletionBody(body).rawResponse).toBe("status: [DONE] ok");
  });

  it("parses a plain JSON completion", () => {
    const body = JSON.stringify({ choices: [{ message: { content: "hi" } }], usage: { total_tokens: 3 } });
    expect(parseCompletionBody(body)).toEqual({ rawResponse: "hi", tokensUsed: 3 });
  });
});

describe("agent request timeout", () => {
  it("aborts a stalled agent request instead of hanging forever", async () => {
    const server = Bun.serve({ port: 0, fetch: () => new Promise<Response>(() => {}) });
    try {
      const runner = new AgentEvaluationRunner({ baseUrl: `http://localhost:${server.port}`, timeoutMs: 200 });
      const start = performance.now();
      await expect(runner.runTaskPrompt("p", [])).rejects.toThrow(/timed out/i);
      expect(performance.now() - start).toBeLessThan(2000);
    } finally {
      server.stop(true);
    }
  }, 5000);
});
