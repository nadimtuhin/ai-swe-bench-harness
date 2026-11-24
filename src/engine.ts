import type { BenchmarkRunSummary, BenchmarkTask, ExecutionResult, TaskEvaluationReport } from "./types";

export type GateExecutor = (gateCommand: string) => Promise<{
  passed: boolean;
  score: number;
  stdout?: string;
  stderr?: string;
}>;

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

  async runAudit(taskId: string, executor: GateExecutor): Promise<TaskEvaluationReport> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const gateResults: ExecutionResult[] = [];
    let weightedScoreSum = 0;
    let totalWeight = 0;
    let allPassed = true;

    for (const gate of task.verificationGates) {
      const start = performance.now();
      let res: Awaited<ReturnType<GateExecutor>>;
      try {
        res = await executor(gate.command);
      } catch (err) {
        // A gate that crashes or times out is a failed gate, not a reason to drop the whole run.
        const message = err instanceof Error ? err.message : String(err);
        res = { passed: false, score: 0, stderr: `Gate executor error: ${message}` };
      }
      const durationMs = performance.now() - start;

      // Scores must be finite and within [0, 1]; anything else is a broken result, scored as 0.
      const validScore = Number.isFinite(res.score) && res.score >= 0 && res.score <= 1;
      const score = validScore ? res.score : 0;

      const threshold = gate.threshold ?? 1.0;
      const weight = gate.weight ?? 1.0;
      const passed = res.passed === true && validScore && score >= threshold;

      if (!passed) allPassed = false;

      weightedScoreSum += score * weight;
      totalWeight += weight;

      gateResults.push({
        gateId: gate.id,
        gateName: gate.name,
        type: gate.type,
        passed,
        score,
        threshold,
        stdout: res.stdout || "",
        stderr: validScore ? res.stderr || "" : `${res.stderr ? `${res.stderr}\n` : ""}Invalid gate score: ${res.score}`,
        durationMs: Math.round(durationMs)
      });
    }

    // A task with no gates was never verified, so it cannot pass.
    if (gateResults.length === 0) allPassed = false;

    const compositeScore = totalWeight > 0 ? Number((weightedScoreSum / totalWeight).toFixed(3)) : 0;

    return {
      taskId: task.taskId,
      title: task.title,
      domain: task.domain,
      workflow: task.workflow,
      difficulty: task.difficulty,
      passed: allPassed,
      compositeScore,
      gateResults,
      auditNotes:
        gateResults.length === 0
          ? "Task has no verification gates; nothing was verified."
          : allPassed
            ? `Task verified against ${task.verificationGates.length} deterministic gates.`
            : `Task failed verification in ${gateResults.filter((g) => !g.passed).length} gate(s).`
    };
  }

  async runAll(executor: GateExecutor): Promise<BenchmarkRunSummary> {
    const start = performance.now();
    const tasks = this.listTasks();
    const reports: TaskEvaluationReport[] = [];

    for (const task of tasks) {
      const report = await this.runAudit(task.taskId, executor);
      reports.push(report);
    }

    const passedTasks = reports.filter((r) => r.passed).length;
    const overallScore =
      reports.length > 0
        ? Number((reports.reduce((acc, r) => acc + r.compositeScore, 0) / reports.length).toFixed(3))
        : 0;

    return {
      totalTasks: reports.length,
      passedTasks,
      failedTasks: reports.length - passedTasks,
      overallScore,
      durationMs: Math.round(performance.now() - start),
      tasks: reports
    };
  }
}
