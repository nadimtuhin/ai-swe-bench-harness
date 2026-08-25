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

export const VerificationGateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["deterministic_test", "ast_diff_audit", "memory_leak_probe", "mutation_score", "merge_conflict_check"]),
  command: z.string(),
  threshold: z.number().optional()
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
  passed: boolean;
  score: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface TaskEvaluationReport {
  taskId: string;
  domain: Domain;
  workflow: WorkflowType;
  passed: boolean;
  compositeScore: number;
  gateResults: ExecutionResult[];
  auditNotes: string;
}
