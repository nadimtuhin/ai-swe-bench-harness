import type { BenchmarkTask, ExecutionResult, TaskEvaluationReport } from "./types";

export class EvaluationEngine {
  constructor(private readonly tasks: Map<string, BenchmarkTask> = new Map()) {}

  registerTask(task: BenchmarkTask): void {
    this.tasks.set(task.taskId, task);
  }

  getTask(taskId: string): BenchmarkTask | undefined {
    return this.tasks.get(taskId);
  }

  listTasks(): BenchmarkTask[] {
    return Array.from(this.tasks.values());
  }

  async runAudit(
    taskId: string,
    executor: (gateCommand: string) => Promise<{ passed: boolean; score: number; stdout: string; stderr: string }>
  ): Promise<TaskEvaluationReport> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const gateResults: ExecutionResult[] = [];
    let totalScore = 0;
    let allPassed = true;

    for (const gate of task.verificationGates) {
      const start = performance.now();
      const res = await executor(gate.command);
      const durationMs = performance.now() - start;

      const passed = res.passed && (gate.threshold === undefined || res.score >= gate.threshold);
      if (!passed) allPassed = false;

      totalScore += res.score;
      gateResults.push({
        gateId: gate.id,
        passed,
        score: res.score,
        stdout: res.stdout,
        stderr: res.stderr,
        durationMs: Math.round(durationMs)
      });
    }

    const compositeScore = task.verificationGates.length > 0
      ? Number((totalScore / task.verificationGates.length).toFixed(2))
      : 0;

    return {
      taskId: task.taskId,
      domain: task.domain,
      workflow: task.workflow,
      passed: allPassed,
      compositeScore,
      gateResults,
      auditNotes: allPassed
        ? `Task verified against ${task.verificationGates.length} deterministic gates.`
        : `Task failed verification in ${gateResults.filter(g => !g.passed).length} gate(s).`
    };
  }
}
