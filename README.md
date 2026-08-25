# AI SWE Benchmark & Verification Harness

[![CI](https://github.com/nadimtuhin/ai-swe-bench-harness/actions/workflows/ci.yml/badge.svg)](https://github.com/nadimtuhin/ai-swe-bench-harness/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An institutional-grade benchmark design framework and evaluation engine for testing autonomous AI coding agents across **4 core engineering domains** and **6 realistic developer workflows**.

---

## 📸 Live Benchmark Execution & Verification Output

![AI SWE Benchmark Harness Execution & Verification Engine](assets/benchmark-execution-preview.png)

---

## 🏛️ Architecture & Evaluation Framework

```
  ┌─────────────────────────────────────────────────────────────┐
  │                 Autonomous Agent Prompt / Task              │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │         Domain Task Layer (Multi-File Codebase Context)      │
  │   - Database & Storage Systems                              │
  │   - SRE / DevOps & Infrastructure                           │
  │   - Compilers & Language Tooling                            │
  │   - Systems, Backend & Networking                           │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                6 Multi-Workflow Execution Matrix            │
  │  [Refactoring] [Test-Writing] [Code Comprehension]          │
  │  [Migration]   [Mergeability] [Performance Optimization]    │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │             Deterministic Verification Gates                │
  │  ✓ Fuzz testing & mutation analysis                         │
  │  ✓ Memory leak / lock contention probes                     │
  │  ✓ AST diff / structural integrity audits                   │
  │  ✓ Zero-delta heap allocation checks                        │
  └─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

1. **Deterministic Evaluation Harness**: Replaces flaky LLM-as-a-judge scorers with strict, runnable verification gates (AST diffs, heap delta profiling, lock contention probes).
2. **Multi-Domain Task Schemas**: Standardized Zod-validated task definitions covering real-world enterprise edge cases.
3. **6 Developer Workflow Archetypes**:
   - **Refactoring**: Decoupling monoliths, state machine refactoring.
   - **Test-Writing**: Property-based tests, boundary condition fuzzing.
   - **Code Comprehension**: Context-heavy multi-repository call graph tracing.
   - **Migration**: Zero-downtime database partitioning, API version migrations.
   - **Code Review / Mergeability**: Merge conflict resolution under semantic constraints.
   - **Performance Optimization**: Zero-copy socket parsers, lock-free queues, latency reduction.

---

## 🧪 Local Testing & Verification

```bash
# Install dependencies
bun install

# Run automated gate evaluation test suite
bun test

# Typecheck validation
bun run typecheck
```

---

## 📄 License
MIT © Nadim Tuhin
