import { describe, expect, it } from "bun:test";
import { AgentEvaluationRunner } from "../src/agent_runner";
import { EvaluationEngine } from "../src/engine";
import { benchmarkTasks } from "../src/tasks";
import { BenchmarkTaskSchema, type BenchmarkTask } from "../src/types";

const ROUTER_URL = "http://localhost:20128";

// Skip the live 9Router test only when the router is not running (e.g. in CI).
async function isRouterReachable(): Promise<boolean> {
  try {
    await fetch(ROUTER_URL, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}
const routerReachable = await isRouterReachable();
if (!routerReachable) console.warn(`9Router not reachable at ${ROUTER_URL}; skipping live agent test.`);

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

  it.skipIf(!routerReachable)("interacts with local 9Router via ag/gemini-3.7-flash-low", async () => {
    const runner = new AgentEvaluationRunner({
      model: "ag/gemini-3.7-flash-low",
      baseUrl: ROUTER_URL,
      apiKey: "sk_9router"
    });

    // No try/catch: once the router is reachable, request errors and assertion failures must fail the test.
    const res = await runner.runTaskPrompt("Explain 1 critical failure mode in Raft log compaction in 1 sentence.", [
      { path: "src/raft.ts", content: "// Raft leader state" }
    ]);
    expect(res.rawResponse.length).toBeGreaterThan(10);
    expect(res.durationMs).toBeGreaterThanOrEqual(0); // rounded to whole ms; a fast local reply can be 0
  });
});
