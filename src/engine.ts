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
      const res = await executor(gate.command);
      const durationMs = performance.now() - start;

      const threshold = gate.threshold ?? 1.0;
      const weight = gate.weight ?? 1.0;
      const passed = res.passed && res.score >= threshold;

      if (!passed) allPassed = false;

      weightedScoreSum += res.score * weight;
      totalWeight += weight;

      gateResults.push({
        gateId: gate.id,
        gateName: gate.name,
        type: gate.type,
        passed,
        score: res.score,
        threshold,
        stdout: res.stdout || "",
        stderr: res.stderr || "",
        durationMs: Math.round(durationMs)
      });
    }

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
      auditNotes: allPassed
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
