---
phase: 02-w-2-line-1a-nodes
plan: "01"
subsystem: tax-nodes
tags: [nodes, w2, line-1a, registry, irs-fixtures, tdd]
dependency_graph:
  requires: [engine/core/types/tax-node.ts, engine/core/runtime/planner.ts, engine/core/runtime/executor.ts]
  provides: [engine/nodes/start/2025/index.ts, engine/nodes/inputs/w2/2025/index.ts, engine/nodes/form_1040/line_01z_wages/2025/index.ts, engine/registry.ts]
  affects: [engine/core/runtime/planner.ts]
tech_stack:
  added: []
  patterns: [TaxNode subclass pattern, Zod schema validation, mini-program node architecture, IRS fixture testing]
key_files:
  created:
    - engine/nodes/start/2025/index.ts
    - engine/nodes/inputs/w2/2025/index.ts
    - engine/nodes/form_1040/line_01z_wages/2025/index.ts
    - engine/nodes/form_1040/line_01z_wages/2025/index.test.ts
    - engine/nodes/inputs/w2/2025/index.test.ts
    - engine/registry.ts
  modified:
    - engine/core/runtime/planner.ts
decisions:
  - "StartNode emits pre-suffixed nodeType IDs (w2_01, w2_02) for multiple W-2s; planner strips suffix via baseNodeType() for registry lookup"
  - "Line01zWagesNode is a leaf node — pending dict shows accumulated input; sum logic verified via direct compute() unit tests"
metrics:
  duration: 3min
  completed: "2026-03-27"
  tasks_completed: 2
  files_changed: 7
---

# Phase 02 Plan 01: W-2 + Line 1a Nodes Summary

**One-liner:** Three TaxNode subclasses (StartNode, W2Node, Line01zWagesNode) with IRS fixture tests proving single and multi-W-2 flows through the engine to line_01z_wages accumulation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement three TaxNode subclasses | d7f960b | engine/nodes/start/2025/index.ts, engine/nodes/inputs/w2/2025/index.ts, engine/nodes/form_1040/line_01z_wages/2025/index.ts |
| 2 | Registry + IRS fixture integration tests | 911583c | engine/registry.ts, engine/nodes/inputs/w2/2025/index.test.ts, engine/nodes/form_1040/line_01z_wages/2025/index.test.ts, engine/core/runtime/planner.ts |

## Verification Results

- `deno check engine/` — PASSED (all 14 files, no type errors)
- `deno test engine/` — PASSED (24 tests, 0 failed)
- IRS fixture: single W-2 box1=85000 → pending["line_01z_wages"].wages === 85000 ✓
- IRS fixture: two W-2s (85000+45000) → pending["line_01z_wages"].wages === [85000, 45000] ✓
- IRS fixture: missing box1 → Zod safeParse fails, node skipped ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Planner multi-instance routing with pre-suffixed IDs**
- **Found during:** Task 2 (two-W-2 IRS fixture test failing)
- **Issue:** When StartNode emits pre-suffixed nodeType IDs (`w2_01`, `w2_02`), the planner used them as step.nodeType for registry lookup. Registry only has `"w2"`, not `"w2_01"`, so the W2Node was never resolved and no downstream edges to `line_01z_wages` were built. Result: line_01z_wages step was absent from plan, two-W-2 test failed.
- **Fix:** Added `baseNodeType()` helper that strips numeric suffix (`_\d+$`). Updated planner step 2 expansion to detect pre-suffixed outputs and set `nodeType: base` while keeping `id: output.nodeType`. Updated queue loop and adjacency building to use `baseNodeType()` fallback for registry lookups.
- **Files modified:** engine/core/runtime/planner.ts
- **Commit:** 911583c

## Decisions Made

1. **Pre-suffixed IDs from StartNode:** StartNode emits `w2_01`/`w2_02` directly for multiple W-2s (single W-2 stays bare `w2`). This ensures executor deposits go to the correct `pending["w2_01"]`/`pending["w2_02"]` keys that the planner creates as step IDs.

2. **Line01zWagesNode as true leaf:** The node computes the sum internally but returns `{ outputs: [] }`. The pending dict after execute() holds the accumulated input (not the computed total). Phase 3 CLI will call compute() on that input to extract line_1a. Tests verify: (a) accumulation in pending is correct, (b) direct compute() handles scalar and array without error.

## Known Stubs

None — all nodes compute real values and all IRS fixture test values are verified.
