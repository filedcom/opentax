---
phase: 02-deductions-worksheets-batch-2
plan: 01
subsystem: depletion-node, sales_tax_deduction-docs
tags: [irc-611, depletion, greater-of, bug-fix, docs]
dependency_graph:
  requires: []
  provides: [depletion-irc-611-compliance, phase2-verification]
  affects: [schedule_c, schedule_e]
tech_stack:
  added: []
  patterns: [Math.max greater-of, pure-function composition]
key_files:
  created: []
  modified:
    - forms/f1040/nodes/inputs/depletion/index.ts
    - forms/f1040/nodes/inputs/depletion/index.test.ts
    - forms/f1040/nodes/inputs/sales_tax_deduction/research/context.md
decisions:
  - "method field kept in schema as UI hint; no longer controls depletion calculation"
  - "depletionDeduction() always computes both cost and percentage, returns Math.max"
metrics:
  duration_seconds: 162
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_modified: 3
---

# Phase 02 Plan 01: Depletion Greater-Of Fix + Phase 2 Verification Summary

IRC §611 compliance fix for depletion node — always take the greater of cost or percentage depletion regardless of method field, verified across all 5 Phase 2 nodes (111 tests pass, type check clean).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix depletion greater-of IRC §611 compliance | cda657b | index.ts, index.test.ts |
| 2 | Fix stale context.md reference + full Phase 2 verification | 5b1cf53 | sales_tax_deduction/research/context.md |

## What Was Built

**Task 1: Depletion greater-of fix**

The `depletionDeduction()` function previously hard-branched on `item.method`: COST method returned only cost depletion, PERCENTAGE method returned only percentage depletion. This violated IRC §611 which mandates taxpayers use the greater of the two.

Fix: replaced the method-branching with `Math.max(costDepletion(item), percentageDepletion(item))`. The `method` field remains in the schema as a UI hint for practitioners but no longer controls the calculation.

3 new cross-method tests added to the "Greater of cost vs percentage" section:
- COAL COST item where percentage wins (cost=5, percentage=5000 → 5000)
- METALS PERCENTAGE item where cost wins (cost=80000, percentage=500 → 80000)
- Tie case (both yield 140)

4 existing tests updated to reflect correct IRC §611 behavior:
- "COST method — cost depletion formula": expected 100 → 500 (percentage wins)
- "COST method with zero basis": expected 0 outputs → 500 (percentage fallback)
- "COST method with zero reserves": expected 0 outputs → 500 (percentage fallback)
- Smoke test Property 2: expected 500 → 7500 (independent producer OIL_GAS, pct wins)

1 test renamed: "COST method ignores percentage depletion rate entirely" → "COST method: percentage=0 (non-independent OIL_GAS), cost wins"

Final: 34 tests, all pass.

**Task 2: Stale reference fix + Phase 2 verification**

Fixed line 44 of sales_tax_deduction/research/context.md: `schedule_a.line_5b_sales_tax` → `schedule_a.line_5a_tax_amount`. All 3 occurrences now consistent.

Full Phase 2 verification:
- 111 tests across all 5 nodes pass
- `deno check forms/f1040/2025/registry.ts` exits 0
- All 5 nodes in registry.ts
- 4 input nodes in inputs.ts (form8582cr correctly absent)
- All 5 screen codes in screens.json (STAX, AUTO, DEPL, CR, LSSA)
- All 5 research/context.md files present

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

Files exist:
- FOUND: forms/f1040/nodes/inputs/depletion/index.ts
- FOUND: forms/f1040/nodes/inputs/depletion/index.test.ts
- FOUND: forms/f1040/nodes/inputs/sales_tax_deduction/research/context.md

Commits exist:
- cda657b: fix(02-01): depletion greater-of IRC §611 compliance
- 5b1cf53: fix(02-01): correct stale field reference in sales_tax_deduction context.md
