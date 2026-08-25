export * from "./types";
export * from "./engine";
export * from "./tasks";
export * from "./agent_runner";

import { EvaluationEngine } from "./engine";
import { benchmarkTasks } from "./tasks";

export function createBenchmarkHarness(): EvaluationEngine {
  const engine = new EvaluationEngine();
  for (const task of benchmarkTasks) {
    engine.registerTask(task);
  }
  return engine;
}
