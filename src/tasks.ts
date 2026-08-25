import { BenchmarkTaskSchema, type BenchmarkTask } from "./types";

export const benchmarkTasks: BenchmarkTask[] = [
  BenchmarkTaskSchema.parse({
    taskId: "DB-MIGRATE-042",
    title: "Zero-Downtime Concurrent Partitioning Migration",
    domain: "database_storage",
    workflow: "migration",
    difficulty: "senior",
    prompt: "Refactor PostgreSQL user_events table to declarative range partitioning with concurrent index swaps under write lock simulation.",
    targetFiles: ["migrations/0042_events_partition.sql", "src/storage/indexer.ts"],
    verificationGates: [
      {
        id: "gate-deterministic-migration",
        name: "Forward & Backward Schema Integrity Check",
        type: "deterministic_test",
        command: "bun test tests/db/migration_integrity.test.ts",
        threshold: 1.0,
        weight: 1.0
      },
      {
        id: "gate-write-lock-probe",
        name: "Lock Contention & TPS Degradation Audit",
        type: "memory_leak_probe",
        command: "bun run scripts/audit-lock-duration.ts",
        threshold: 0.95,
        weight: 1.2
      }
    ]
  }),

  BenchmarkTaskSchema.parse({
    taskId: "NET-PERF-108",
    title: "Zero-Copy TCP Buffer Pool & Flow Control Optimizer",
    domain: "systems_networking",
    workflow: "performance_optimization",
    difficulty: "principal",
    prompt: "Eliminate heap allocations in high-throughput chunked socket parser using shared ring buffer pooling and backpressure signaling.",
    targetFiles: ["src/net/buffer_pool.ts", "src/net/socket_stream.ts"],
    verificationGates: [
      {
        id: "gate-alloc-benchmark",
        name: "Heap Allocation Zero-Delta Check",
        type: "heap_allocation_zero_delta",
        command: "bun run bench/buffer_allocation.bench.ts",
        threshold: 0.98,
        weight: 1.5
      },
      {
        id: "gate-fuzz-test",
        name: "Packet Reorder & Fragment Fuzz Harness",
        type: "deterministic_test",
        command: "bun test tests/net/fuzz_stream.test.ts",
        threshold: 1.0,
        weight: 1.0
      }
    ]
  }),

  BenchmarkTaskSchema.parse({
    taskId: "COMP-AST-204",
    title: "Dead Branch Pruning & Control Flow Graph Simplifier",
    domain: "compilers_language_tooling",
    workflow: "refactoring",
    difficulty: "senior",
    prompt: "Implement AST transformer that evaluates compile-time pure constants, eliminates unreachable basic blocks, and preserves debug line mappings.",
    targetFiles: ["src/compiler/cfg_optimizer.ts", "src/compiler/ast_visitor.ts"],
    verificationGates: [
      {
        id: "gate-ast-invariance",
        name: "AST Invariance & Bytecode Equivalence Check",
        type: "ast_diff_audit",
        command: "bun test tests/compiler/ast_equivalence.test.ts",
        threshold: 1.0,
        weight: 1.0
      }
    ]
  }),

  BenchmarkTaskSchema.parse({
    taskId: "SRE-CHAOS-301",
    title: "Split-Brain Network Partition Recovery in Raft Node",
    domain: "sre_infrastructure",
    workflow: "test_writing",
    difficulty: "principal",
    prompt: "Write deterministic chaos test suite simulating asymmetric 3-node network partition, verifying term increments, leader lease drop, and log convergence.",
    targetFiles: ["tests/chaos/raft_partition_test.go", "deploy/chaos-mesh.yaml"],
    verificationGates: [
      {
        id: "gate-mutation-kill",
        name: "Fault Injection Mutation Kill Rate",
        type: "mutation_score",
        command: "bun run scripts/mutation_runner.ts",
        threshold: 0.92,
        weight: 1.3
      }
    ]
  })
];
