---
phase: quick-260401-wdm
plan: 01
subsystem: forms/f1040/nodes/inputs
tags: [audit, output-helper, type-safety, special-situations]
dependency_graph:
  requires: []
  provides: [f5405-output-helper, household_wages-output-helper]
  affects: [f5405, household_wages, clergy, f8915f, f8915d]
tech_stack:
  added: []
  patterns: [output()-helper, pure-functions, immutable-output]
key_files:
  modified:
    - forms/f1040/nodes/inputs/f5405/index.ts
    - forms/f1040/nodes/inputs/household_wages/index.ts
  read_only:
    - forms/f1040/nodes/inputs/clergy/index.ts
    - forms/f1040/nodes/inputs/f8915f/index.ts
    - forms/f1040/nodes/inputs/f8915d/index.ts
decisions:
  - household_wages uses two branching output() calls (withheld vs not) rather than a spread pattern, matching single-output expectation in tests
metrics:
  duration: ~5 minutes
  completed: 2026-04-01
  tasks_completed: 3
  files_modified: 2
---

# Quick Task 260401-wdm: Phase 3 Special Situations A — Node Audit

**One-liner:** Audited 5 special-situations nodes for IRS routing compliance; replaced `Record<string, number>` raw output objects in f5405 and household_wages with type-safe `output()` helper.

## Tasks Completed

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Audit clergy, f8915f, f8915d routing compliance — run tests | Done (no changes needed) | — |
| 2 | Fix f5405 and household_wages — replace raw output objects with output() helper | Done | db86742 |
| 3 | Verify full registry compilation and all 5 nodes registered | Done (verification only) | — |

## Audit Findings

### clergy (IRS Pub 517) — Correct, no change
- Routes to `schedule_se` via `net_profit_schedule_c` field (SE tax base = wages + designated housing allowance per IRC §1402(a)(8))
- Routes to `schedule1.line8z_other_income` as negative housing exclusion (IRC §107)
- Uses `output()` helper. Pattern correct.

### f8915f (IRC §72(t)(2)(G)) — Correct, no change
- Routes to `schedule1.line8z_other_income` (not Schedule 3 — that handles credits/payments)
- 3-year spreading logic with repayment credit handling
- Uses `output()` helper. Pattern correct.

### f8915d (Notice 2019-70) — Correct, no change
- Routes to `schedule1.line8z_other_income`
- By TY2025 spreading is complete; repayments generate credit via negative net
- Uses `output()` helper. Pattern correct.

### f5405 — Fixed
- Was using raw `{ nodeType: schedule2.nodeType, fields: { ... } }` object
- Now uses `output(schedule2, { line10_homebuyer_credit_repayment: total })`

### household_wages — Fixed
- Was using `Record<string, number>` typed `fields` variable (type-safety violation per CLAUDE.md)
- Was using raw `{ nodeType: f1040.nodeType, fields }` object
- Now uses `output(f1040, { line1b_household_wages: wages, line25a_w2_withheld: withheld })` in a single call (matching tests' expectation of `outputs.length === 1`)

## Verification

- `deno check forms/f1040/2025/registry.ts` exits 0
- All 128 tests across 5 nodes pass
- registry.ts: 10 matches (2 per node), inputs.ts: 10 matches, screens.json: 5 matches

## Deviations from Plan

### Auto-fixed Issue

**[Rule 1 - Bug] household_wages two-output approach failed tests**
- **Found during:** Task 2
- **Issue:** Plan suggested two separate `output()` calls (one for wages, one for withheld). Tests explicitly assert `outputs.length === 1` and expect both fields on a single output.
- **Fix:** Used a single `output(f1040, { line1b_household_wages: wages, line25a_w2_withheld: withheld })` when withheld > 0; single `output(f1040, { line1b_household_wages: wages })` otherwise.
- **Files modified:** forms/f1040/nodes/inputs/household_wages/index.ts
- **Commit:** db86742

## Known Stubs

None.

## Self-Check: PASSED

- `forms/f1040/nodes/inputs/f5405/index.ts` — output() helper confirmed present
- `forms/f1040/nodes/inputs/household_wages/index.ts` — output() helper confirmed present, no Record<string, number>
- Commit db86742 confirmed in git log
