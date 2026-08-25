import { describe, expect, it } from "bun:test";
import { AgentEvaluationRunner } from "../src/agent_runner";
import { EvaluationEngine } from "../src/engine";
import { benchmarkTasks } from "../src/tasks";
import { BenchmarkTaskSchema, type BenchmarkTask } from "../src/types";

describe("Benchmark Harness Evaluation Engine", () => {
  const sampleTask: BenchmarkTask = BenchmarkTaskSchema.parse({
    taskId: "TEST-REF-001",
    title: "Distributed Raft Log Compaction Refactor",
    domain: "database_storage",
    workflow: "refactoring",
    difficulty: "principal",
    prompt: "Refactor Raft log segment snapshotting to avoid disk sync stalls.",
    targetFiles: ["src/raft/log.ts"],
    verificationGates: [
      {
        id: "g1",
        name: "Unit test gate",
        type: "deterministic_test",
        command: "bun test",
        threshold: 1.0
      },
      {
        id: "g2",
        name: "Performance degradation gate",
        type: "memory_leak_probe",
        command: "bun run bench",
        threshold: 0.9
      }
    ]
  });

  it("registers and lists tasks correctly", () => {
    const engine = new EvaluationEngine();
    engine.registerTask(sampleTask);
    expect(engine.listTasks()).toHaveLength(1);
    expect(engine.getTask("TEST-REF-001")?.title).toContain("Raft Log Compaction");
  });

  it("evaluates passing gates with composite score calculation", async () => {
    const engine = new EvaluationEngine();
    engine.registerTask(sampleTask);

    const report = await engine.runAudit("TEST-REF-001", async (cmd) => {
      return {
        passed: true,
        score: cmd.includes("bench") ? 0.95 : 1.0,
        stdout: "PASS",
        stderr: ""
      };
    });

    expect(report.passed).toBe(true);
    expect(report.compositeScore).toBe(0.975);
    expect(report.gateResults).toHaveLength(2);
  });

  it("evaluates all registered benchmark tasks", async () => {
    const engine = new EvaluationEngine();
    for (const t of benchmarkTasks) {
      engine.registerTask(t);
    }

    const summary = await engine.runAll(async () => ({ passed: true, score: 1.0 }));
    expect(summary.totalTasks).toBe(benchmarkTasks.length);
    expect(summary.passedTasks).toBe(benchmarkTasks.length);
    expect(summary.overallScore).toBe(1.0);
  });

  it("interacts with local 9Router via ag/gemini-3.7-flash-low", async () => {
    const runner = new AgentEvaluationRunner({
      model: "ag/gemini-3.7-flash-low",
      baseUrl: "http://localhost:20128",
      apiKey: "sk_9router"
    });

    try {
      const res = await runner.runTaskPrompt("Explain 1 critical failure mode in Raft log compaction in 1 sentence.", [
        { path: "src/raft.ts", content: "// Raft leader state" }
      ]);
      expect(res.rawResponse.length).toBeGreaterThan(10);
      expect(res.durationMs).toBeGreaterThan(0);
    } catch (e: any) {
      // Allow fallback if local 9router is offline during CI
      console.warn("9Router local ping skipped:", e.message);
    }
  });
});
