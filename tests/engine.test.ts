import { describe, expect, it } from "bun:test";
import { EvaluationEngine } from "../src/engine";
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
    expect(report.compositeScore).toBe(0.97);
    expect(report.gateResults).toHaveLength(2);
  });

  it("flags failed tasks if any gate falls below threshold", async () => {
    const engine = new EvaluationEngine();
    engine.registerTask(sampleTask);

    const report = await engine.runAudit("TEST-REF-001", async (cmd) => {
      if (cmd.includes("bench")) {
        return { passed: false, score: 0.6, stdout: "SLOW", stderr: "Threshold missed" };
      }
      return { passed: true, score: 1.0, stdout: "PASS", stderr: "" };
    });

    expect(report.passed).toBe(false);
    expect(report.auditNotes).toContain("failed verification");
  });
});
