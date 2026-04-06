---
phase: 17-validation-dsl-foreach-everyitem-extension
plan: 01
subsystem: core/validation
tags: [validation, dsl, predicates, combinators, ein]
dependency_graph:
  requires: []
  provides: [fieldArray, forEach, everyItem, sumOfAll, allDistinct]
  affects: [forms/f1040/validation/rules/fw2.ts, forms/f1040/validation/rules/fw2g.ts, forms/f1040/validation/rules/f1099r.ts]
tech_stack:
  added: []
  patterns: [cross-instance-iteration, array-field-combinator, vacuous-truth]
key_files:
  created: []
  modified:
    - core/validation/types.ts
    - core/validation/context.ts
    - core/validation/predicates.ts
    - core/validation/predicates.test.ts
    - core/validation/mod.ts
    - forms/f1040/validation/rules/fw2.ts
    - forms/f1040/validation/rules/fw2g.ts
    - forms/f1040/validation/rules/f1099r.ts
decisions:
  - forEach and everyItem are identical in semantics — both iterate array-valued pending dict fields with vacuous truth on empty; kept both for DSL clarity
  - fieldArray() uses resolveField() internally, handles mergePending arrays transparently
  - sumOfAll uses reduce<number> to preserve type safety with unknown array elements
  - Only 3 EIN format validation stubs exist in codebase (fw2, fw2g, f1099r); plan overestimated 6 — wired all 3
metrics:
  duration_minutes: 15
  tasks_completed: 2
  files_modified: 8
  completed_date: "2026-04-06T00:48:15Z"
requirements:
  - REQ-VAL-01
---

# Phase 17 Plan 01: Validation DSL forEach/everyItem Extension Summary

Implemented `forEach`, `everyItem`, `sumOfAll`, and `allDistinct` cross-instance DSL combinators in `core/validation/` with `fieldArray()` support. Wired `validEIN` into 3 EIN format rule files replacing `alwaysPass` stubs.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Extend ReturnContext + implement forEach/everyItem/sumOfAll/allDistinct with tests | ae0aa60 | types.ts, context.ts, predicates.ts, predicates.test.ts, mod.ts |
| 2 | Wire validEIN into 3 EIN format rule files | 06e88d1 | fw2.ts, fw2g.ts, f1099r.ts |

## What Was Built

### Task 1: Cross-instance combinators

**`fieldArray(xmlName)`** added to `ReturnContext` interface and implemented in `createReturnContext()`:
- Returns `readonly unknown[]`
- Passes arrays directly (from `mergePending` promotion)
- Wraps single values in `[value]`
- Returns `[]` for absent/null/empty fields

**`forEach(xml, itemPred)`** — every element of array-valued field must satisfy `itemPred`. Passes vacuously on empty.

**`everyItem(xml, itemPred)`** — alias for `forEach` with different naming emphasis.

**`sumOfAll(target, source)`** — target field must equal sum of all source array elements (penny tolerance).

**`allDistinct(xml)`** — all elements of array-valued field must be unique (strips non-digit chars for SSN/EIN comparison).

All 4 combinators exported from `core/validation/mod.ts`.

16 new tests covering all behaviors including vacuous truth, array, single-value, and absent-field cases.

### Task 2: EIN format wiring

Replaced `alwaysPass` with `validEIN()` in 3 EIN format rule files:

| Rule | File | Field | Before | After |
|------|------|-------|--------|-------|
| FW2-499 | fw2.ts | `EmployerEIN` | `alwaysPass` | `validEIN("EmployerEIN")` |
| FW2G-003 | fw2g.ts | `PayerEIN` | `alwaysPass` | `validEIN("PayerEIN")` |
| F1099R-499-02 | f1099r.ts | `PayerEIN` | `alwaysPass` | `validEIN("PayerEIN")` |

## Deviations from Plan

### Plan Discrepancy (Task 2 target files)

**Found during:** Task 2 — investigating target files

**Issue:** Plan specified 6 EIN format rule files (fw2, fw2g, f1099r, f8863, f8959, f8960). Auditing each file revealed only 3 contain EIN *format* validation stubs ("EIN invalid for processing an Individual e-filed return"). f8863, f8959, and f8960 contain no EIN format stubs — their `alwaysPass` rules are cross-instance aggregation checks and database lookups that remain deferred.

**Fix:** Wired `validEIN` into all 3 files with true EIN format stubs. `must_haves` truth "at least 5" could not be satisfied; only 3 such stubs exist in the codebase.

**Files audited and ruled out:**
- `f8863.ts`: F8863-026-01 requires EIN *presence* in repeating group (cross-instance), not format validation
- `f8959.ts`: No EIN format stubs — all `alwaysPass` rules are cross-form sum comparisons
- `f8960.ts`: No EIN format stubs — all `alwaysPass` rules are cross-form comparisons

## Known Stubs

None introduced in this plan. Previously-existing `alwaysPass` stubs remain in fw2.ts (FW2-001-03, FW2-007-01, FW2-008-01, FW2-012, FW2-502, FW2-505-01) and fw2g.ts/f1099r.ts per the ALWAYSPASS_ROADMAP — these require database lookups or cross-form iteration not enabled by this plan.

## Self-Check: PASSED

All created/modified files verified.
