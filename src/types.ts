import { z } from "zod";

export const WorkflowTypeSchema = z.enum([
  "refactoring",
  "test_writing",
  "code_comprehension",
  "migration",
  "code_review_mergeability",
  "performance_optimization"
]);
export type WorkflowType = z.infer<typeof WorkflowTypeSchema>;

export const DomainSchema = z.enum([
  "database_storage",
  "sre_infrastructure",
  "compilers_language_tooling",
  "systems_networking"
]);
export type Domain = z.infer<typeof DomainSchema>;

export const DifficultyLevelSchema = z.enum(["intermediate", "senior", "principal"]);
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;

export const GateTypeSchema = z.enum([
  "deterministic_test",
  "ast_diff_audit",
  "memory_leak_probe",
  "mutation_score",
  "merge_conflict_check",
  "heap_allocation_zero_delta"
]);
export type GateType = z.infer<typeof GateTypeSchema>;

export const VerificationGateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: GateTypeSchema,
  command: z.string(),
  threshold: z.number().default(1.0),
  weight: z.number().default(1.0)
});
export type VerificationGate = z.infer<typeof VerificationGateSchema>;

export const BenchmarkTaskSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  domain: DomainSchema,
  workflow: WorkflowTypeSchema,
  difficulty: DifficultyLevelSchema,
  prompt: z.string(),
  targetFiles: z.array(z.string()),
  verificationGates: z.array(VerificationGateSchema),
  oracleSolutionSha: z.string().optional()
});
export type BenchmarkTask = z.infer<typeof BenchmarkTaskSchema>;

export interface ExecutionResult {
  gateId: string;
  gateName: string;
  type: GateType;
  passed: boolean;
  score: number;
  threshold: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface TaskEvaluationReport {
  taskId: string;
  title: string;
  domain: Domain;
  workflow: WorkflowType;
  difficulty: DifficultyLevel;
  passed: boolean;
  compositeScore: number;
  gateResults: ExecutionResult[];
  auditNotes: string;
}

export interface BenchmarkRunSummary {
  totalTasks: number;
  passedTasks: number;
  failedTasks: number;
  overallScore: number;
  durationMs: number;
  tasks: TaskEvaluationReport[];
}
