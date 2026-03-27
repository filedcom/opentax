---
phase: 01-core-engine-foundation
plan: 02
subsystem: runtime
tags: [deno, typescript, executor, planner, topo-sort, pending-dict, tdd]

# Dependency graph
requires:
  - 01-01 (TaxNode abstract class, NodeRegistry type, mod.ts barrel export)
provides:
  - buildExecutionPlan: expands node instances from start.compute() + Kahn's topological sort
  - ExecutionStep type (id + nodeType)
  - execute: runs sorted plan with pending dict accumulation
  - ExecuteResult type (pending dict)
  - engine/mod.ts extended with planner and executor public API
affects:
  - 02-w2-line1a (W-2 and line_01z nodes use executor to process returns)
  - 03-cli-storage (CLI calls execute() to compute returns)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Kahn's BFS topological sort with inDegree tracking
    - Pending dict accumulation with scalar-to-array promotion on second deposit
    - safeParse-based optional node skipping (Zod validation as gate)
    - Stateless execution (fresh pending dict per call)

key-files:
  created:
    - engine/core/runtime/planner.ts
    - engine/core/runtime/planner.test.ts
    - engine/core/runtime/executor.ts
    - engine/core/runtime/executor.test.ts
  modified:
    - engine/mod.ts

key-decisions:
  - "Scalar-to-array promotion on second deposit: when two nodes deposit the same scalar key to the same target, the second write promotes to array rather than overwriting. This is the W-2 wages accumulation pattern."
  - "Planner runs start.compute() with actual inputs to discover which instances to create — planner is not purely static metadata."
  - "Multi-instance IDs use _01/_02 suffix; singleton IDs use nodeType directly as ID."
  - "Optional node skip implemented via Zod safeParse failure on empty pending entry — no special opt-in required from node authors."

patterns-established:
  - "Two-phase execution: buildExecutionPlan (expand + sort) then execute (pending dict accumulation)"
  - "Instance ID convention: multiple outputs of same nodeType → nodeType_01, nodeType_02; single output → nodeType"
  - "Downstream edges for non-start nodes built from outputNodeTypes metadata (singletons only)"

requirements-completed: [EXEC-01, EXEC-02, EXEC-03, EXEC-04]

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 1 Plan 02: Two-Phase Executor — Planner + Executor Summary

**Stateless two-phase executor: buildExecutionPlan expands instances from start.compute() and topologically sorts via Kahn's algorithm; execute runs the sorted plan with pending dict accumulation including scalar-to-array promotion for multi-W-2 deposits**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-27T00:32:18Z
- **Completed:** 2026-03-27T00:35:29Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `buildExecutionPlan` correctly expands start node outputs into instances (with `_01`/`_02` suffixes for multiple, bare nodeType for singles), builds adjacency list from `outputNodeTypes` metadata, and runs Kahn's BFS topological sort
- `execute` seeds pending with inputs, runs each step in topo order, applies `safeParse` per node (skipping optional nodes silently on failure), and accumulates outputs via `mergePending`
- `mergePending` implements the critical scalar-to-array promotion: first deposit sets scalar, second deposit (same key) promotes to array — this is how 2 W-2s produce `wages: [85000, 45000]`
- Stateless by design: fresh `pending` dict created per `execute` call
- 11 total tests: 5 planner + 6 executor — all pass with zero type errors
- `deno check engine/` passes clean
- `engine/mod.ts` exports the full public API: `buildExecutionPlan`, `ExecutionStep`, `execute`, `ExecuteResult`

## Task Commits

Each task was committed atomically (TDD: RED → GREEN):

1. **Task 1 RED+GREEN: Planner implementation** - `5c4545b` (feat)
   - Test written first, then implementation
   - Planner tests pass: single node, linear chain, multi-instance, singleton ID, diamond graph
2. **Task 2 GREEN: Executor implementation** - `602e93f` (feat)
   - executor.ts, executor.test.ts, mod.ts update in single commit
   - Executor tests pass: 2-node DAG, array accumulation, scalar set, optional skip, full W-2, stateless

## Files Created/Modified

- `engine/core/runtime/planner.ts` — `buildExecutionPlan` function and `ExecutionStep` type
- `engine/core/runtime/planner.test.ts` — 5 planner tests with mock TaxNode subclasses
- `engine/core/runtime/executor.ts` — `execute` function, `ExecuteResult` type, `mergePending` internal helper
- `engine/core/runtime/executor.test.ts` — 6 executor tests covering all accumulation scenarios
- `engine/mod.ts` — Extended with planner and executor re-exports

## Decisions Made

- **Scalar-to-array promotion:** When two nodes deposit the same scalar key to the same target, the pending dict promotes from scalar to array rather than overwriting. This directly implements the W-2 wages accumulation described in research.md (steps 2-3 of the array accumulation example).
- **Planner runs start.compute():** The planner must actually execute start.compute(inputs) to discover which instances to create (since start decides based on what forms are present). This is a live execution, not static metadata traversal.
- **Multi-instance ID convention:** `_01`/`_02` suffixes only when the same nodeType appears multiple times in start's outputs. Single-occurrence outputs use the nodeType as-is — this is what the executor uses as the pending dict key.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed array accumulation: scalar overwrite replaced with scalar-to-array promotion**
- **Found during:** Task 2 GREEN verification (2 tests failed)
- **Issue:** Original `mergePending` logic used last-writer-wins for scalar fields, causing the second W-2 wages deposit to overwrite instead of accumulate. Tests `array accumulation` and `full W-2 scenario` failed.
- **Fix:** Changed `mergePending` to detect when a scalar field already exists and a second scalar is deposited — promotes to array `[existing, incoming]`. This matches the research.md accumulation diagram (steps 2-3).
- **Files modified:** `engine/core/runtime/executor.ts`
- **Commit:** `602e93f` (included in the GREEN commit)

## Known Stubs

None — all data flows are wired. The executor returns a live `pending` dict populated from actual node computations.

## Issues Encountered

None beyond the auto-fixed array accumulation bug above.

## Next Phase Readiness

- `buildExecutionPlan` + `execute` form the complete engine brain — ready for W-2 and line_01z node implementations (phase 02)
- Node authors only need to implement `TaxNode` subclasses with correct `inputSchema`, `outputNodeTypes`, and `compute()` — the executor handles all routing
- The scalar-to-array promotion is transparent to node authors; they write scalar outputs, accumulation happens in the runtime
- No blockers for next plan

---
*Phase: 01-core-engine-foundation*
*Completed: 2026-03-27*

## Self-Check: PASSED

All files found:
- engine/core/runtime/planner.ts
- engine/core/runtime/executor.ts
- engine/core/runtime/planner.test.ts
- engine/core/runtime/executor.test.ts
- .planning/phases/01-core-engine-foundation/01-02-SUMMARY.md

All commits found:
- 5c4545b (feat(01-02): planner)
- 602e93f (feat(01-02): executor)
