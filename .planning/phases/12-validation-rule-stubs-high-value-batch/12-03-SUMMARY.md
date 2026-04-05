---
phase: 12-validation-rule-stubs-high-value-batch
plan: "03"
subsystem: validation
tags: [mef-rules, alwaysPass, roadmap, documentation, audit]
dependency_graph:
  requires: [12-02]
  provides: [REQ-VAL-01]
  affects: [forms/f1040/validation/ALWAYSPASS_ROADMAP.md]
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - forms/f1040/validation/ALWAYSPASS_ROADMAP.md
decisions:
  - "285 test failures are all pre-existing (confirmed by stash test); zero regressions from Phase 12 changes"
  - "ALWAYSPASS_ROADMAP.md is the living audit record for stub conversion progress"
metrics:
  duration: "8 minutes"
  completed: "2026-04-05T22:17:00Z"
  tasks_completed: 1
  files_modified: 1
---

# Phase 12 Plan 03: Validation Rule Stubs High-Value Batch — Summary

Updated ALWAYSPASS_ROADMAP.md with Round 4 predicate conversions from Phase 12, documented 7 converted rules with full predicate details, and added exhaustive audit findings explaining why ~533 remaining stubs require DSL extensions or server-side capabilities.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Audit conversion counts and update ALWAYSPASS_ROADMAP.md | 63e224f | ALWAYSPASS_ROADMAP.md |

## Changes Made

### ALWAYSPASS_ROADMAP.md — Round 4 additions

- Updated header date to `2026-04-05`
- Updated total: 533 rules remain (540 − 115 through Round 3 − 7 in Round 4)
- Added exhaustive audit note: only 7 stubs implementable with single-instance predicate DSL
- Added **Round 4** predicates: `validEIN`, `betweenNum`, `diffLteNum`, `notGtPctOfField`
- Added Phase 12 converted rules table (7 rules with file, predicate, and description)
- Added deferred stub breakdown table explaining ~533 remaining stubs by category/blocker
- Added "Next unlock" guidance: forEach/everyItem DSL extension for ~320 cross-instance rules

### Converted rules documented (Round 4)

| Rule ID | File | Predicate(s) |
|---------|------|-------------|
| FPYMT-088-11 | fpymt.ts | `any(all(dateYearEqConst, dateMonthDayEq), ...)` |
| FPYMT-089 | fpymt.ts | `notGtPctOfField("PaymentAmt", "OwedAmt", 2.0)` |
| F1116-007-01 | f1116.ts | `ifThen(formCountAtMost, all(isZero x8))` |
| F3468-032-01 | f3468.ts | `ifThen(hasValue, any(all x3))` |
| F9465-044 | f9465.ts | `ifThen(betweenNum(25001,50000), any(all(routing+bank), payroll))` |
| F8814-001 | f8814.ts | `ifThen(formCountAtMost("form8814", 1), noValue("MultipleForm8814Ind"))` |
| SSE-F1040-001 | sse.ts | `matchesHeaderSSN("SSN")` |

## Test Results

```
30088 passed | 285 failed (pre-existing, confirmed identical before/after this plan's changes)
```

Zero regressions. The 285 failures are all pre-existing MEF builder test failures unrelated to Phase 12 work (confirmed via `git stash` baseline comparison).

## Deviations from Plan

None. Plan executed exactly as written.

The plan's action items noted the audit finding from Plan 02 (7 conversions instead of 40+) — this was already documented in 12-02-SUMMARY.md. This plan correctly records that reality in ALWAYSPASS_ROADMAP.md without re-litigating the count deviation.

## Self-Check: PASSED

- `grep "Round 4" forms/f1040/validation/ALWAYSPASS_ROADMAP.md` returns a match ✓
- `grep "2026-04-05" forms/f1040/validation/ALWAYSPASS_ROADMAP.md` returns a match ✓
- `grep "validEIN" forms/f1040/validation/ALWAYSPASS_ROADMAP.md` returns a match ✓
- deno task test: 30088 passed, 285 pre-existing failures (zero regressions) ✓
- commit 63e224f exists ✓
