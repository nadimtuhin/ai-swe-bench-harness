import { EvaluationEngine } from "./engine";
import { BenchmarkTaskSchema, type BenchmarkTask } from "./types";

export const sampleTasks: BenchmarkTask[] = [
  BenchmarkTaskSchema.parse({
    taskId: "DB-MIGRATE-042",
    title: "Zero-Downtime Concurrent Index & Partitioning Migration",
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
        threshold: 1.0
      },
      {
        id: "gate-write-lock-probe",
        name: "Lock Contention & TPS Degradation Audit",
        type: "memory_leak_probe",
        command: "bun run scripts/audit-lock-duration.ts",
        threshold: 0.95
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
        type: "performance_optimization" as any,
        command: "bun run bench/buffer_allocation.bench.ts",
        threshold: 0.98
      },
      {
        id: "gate-fuzz-test",
        name: "Packet Reorder & Fragment Fuzz Harness",
        type: "deterministic_test",
        command: "bun test tests/net/fuzz_stream.test.ts",
        threshold: 1.0
      }
    ]
  })
];

export function createBenchmarkHarness(): EvaluationEngine {
  const engine = new EvaluationEngine();
  for (const task of sampleTasks) {
    engine.registerTask(task);
  }
  return engine;
}
