---
phase: 12-validation-rule-stubs-high-value-batch
plan: "02"
subsystem: validation
tags: [mef-rules, predicates, alwaysPass, stubs, validation-dsl]
dependency_graph:
  requires: [12-01]
  provides: [REQ-VAL-01-partial]
  affects: [forms/f1040/validation/rules/*.ts, core/validation/predicates.ts, core/validation/mod.ts]
tech_stack:
  added: []
  patterns: [predicate-composition, formCountAtMost, notGtPctOfField, betweenNum, dateYearEqConst, dateMonthDayEq, isZero, matchesHeaderSSN]
key_files:
  created: []
  modified:
    - forms/f1040/validation/rules/fpymt.ts
    - forms/f1040/validation/rules/f1116.ts
    - forms/f1040/validation/rules/f3468.ts
    - forms/f1040/validation/rules/f9465.ts
    - forms/f1040/validation/rules/f8814.ts
    - forms/f1040/validation/rules/sse.ts
    - core/validation/predicates.ts
    - core/validation/mod.ts
decisions:
  - "Only 7 alwaysPass stubs in the entire codebase are implementable with the single-instance predicate DSL; the remaining ~533 stubs require cross-instance iteration, database lookups, or binary attachment inspection — capabilities beyond the predicate model"
  - "Cherry-picked Plan 01 predicates (validEIN, betweenNum, diffLteNum, notGtPctOfField) into this worktree via git cat-file to resolve file-system/git-object divergence in the worktree"
metrics:
  duration: "28 minutes"
  completed: "2026-04-05T21:49:00Z"
  tasks_completed: 2
  files_modified: 8
---

# Phase 12 Plan 02: Validation Rule Stubs High-Value Batch — Summary

Convert alwaysPass validation rule stubs to real predicate implementations. Cherry-picked Plan 01 predicates then exhaustively audited all 540+ stubs to find 7 that were implementable with the single-instance predicate DSL.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Convert 7 alwaysPass stubs to real predicates (first batch) | 176443a | fpymt.ts, f1116.ts, f3468.ts, f9465.ts, f8814.ts, sse.ts, predicates.ts, mod.ts |
| 2 | Exhaustive audit of second batch — confirmed 0 additional implementable stubs | (no code changes) | — |

## Rules Converted

| Rule ID | File | Predicate Used | Description |
|---------|------|---------------|-------------|
| FPYMT-088-11 | fpymt.ts | `any(all(dateYearEqConst, dateMonthDayEq), ...)` | TY2025 quarterly due dates (4/15, 6/15, 9/15, 1/15 next year) |
| FPYMT-089 | fpymt.ts | `notGtPctOfField("PaymentAmt", "OwedAmt", 2.0)` | Payment <= 200% of owed amount |
| F1116-007-01 | f1116.ts | `ifThen(formCountAtMost, all(isZero x8))` | Single Form 1116: all 8 credit fields must be zero |
| F3468-032-01 | f3468.ts | `ifThen(hasValue, any(all x3))` | LowIncmSolarWindBonusCrPct percentage validation (.10/.20/0) |
| F9465-044 | f9465.ts | `ifThen(betweenNum(25001,50000), any(all(routing+bank), payroll))` | Tax 25k-50k: must provide bank routing or payroll deduction |
| F8814-001 | f8814.ts | `ifThen(formCountAtMost("form8814", 1), noValue("MultipleForm8814Ind"))` | Single Form 8814: MultipleForm8814Ind must not be checked |
| SSE-F1040-001 | sse.ts | `matchesHeaderSSN("SSN")` | Schedule SE SSN must match primary or spouse SSN in header |

## Deviations from Plan

### Deviation: 7 conversions instead of 40+

**Found during:** Task 1 audit, confirmed during Task 2 audit

**Issue:** The plan targeted 40+ alwaysPass stub conversions across 25+ files. After exhaustive audit of all ~540 stubs across 79 rule files, only 7 were found to be implementable with the current single-instance predicate DSL.

**Root cause:** The ALWAYSPASS_ROADMAP.md categorizes the stubs, but the "implementable" category turned out to be much smaller than estimated. The vast majority of stubs fall into:
- **Cross-instance iteration** (~60%): Rules like "sum of all Form X", "two Forms must differ", "each instance in group" — require a `forEach`/`everyItem` DSL extension not yet built
- **Database/server-side** (~25%): EIN validation against IRS e-File database, zip code ranges, received dates, program participation
- **Binary attachment inspection** (~10%): Rules requiring PDF/XML attachment manifest access
- **Per-item repeating groups** (~5%): Rules inside XSD group types (e.g., Form 7218 ClnAvnNonAvnFuelPrdcdSoldGrp, Form 8835 Part II lines)

**Fix:** Converted all 7 implementable stubs. No additional rules can be implemented without DSL extensions.

**Impact on success criteria:**
- "40+ alwaysPass stubs converted" — NOT MET (7 converted)
- "At least 5 TIN/EIN format rules" — NOT MET (1 SSN rule converted: SSE-F1040-001)
- "At least 5 conditional math rules" — PARTIALLY MET (5 conditional math/date rules: FPYMT-088-11, FPYMT-089, F1116-007-01, F9465-044, F8814-001)
- "FPYMT-088-11 date validation" — MET
- "FPYMT-089 payment pct check" — MET
- "F1116-007-01 single-form-count + zero checks" — MET
- "No previously-passing rules broken" — MET (24080 passing, 226 pre-existing failures unchanged)

### Auto-fixed: Cherry-pick file-system divergence

**Found during:** Pre-execution setup

**Issue:** Worktree file-system had stale predicates.ts (387 lines) after cherry-pick of commit 4ce54a3. The git object store had the correct 424-line version but the physical files were not updated.

**Fix:** Used `git cat-file blob HEAD:core/validation/predicates.ts` to force-write correct content from git object store. Same for mod.ts.

**Files modified:** core/validation/predicates.ts, core/validation/mod.ts

**Rule:** Rule 3 (blocking issue)

## Audit Summary

Files audited for implementable stubs: 79 rule files (~540 total alwaysPass stubs)

| Category | Count | Implementable |
|----------|-------|---------------|
| Cross-instance iteration | ~320 | 0 (needs forEach DSL) |
| Database/server-side | ~135 | 0 (server-only) |
| Binary attachment | ~55 | 0 (manifest access) |
| Per-item repeating groups | ~23 | 0 (needs everyItem DSL) |
| Single-instance predicate | 7 | 7 (all converted) |

## Path Forward for Remaining Stubs

To unlock the cross-instance stub category (~320 rules), a future plan should add:
- `forEach(formType, predicate)` — applies predicate to every instance, requires all to pass
- `everyItem(groupField, predicate)` — applies predicate to every item in a repeating group
- `sumOfAll(formType, fieldName)` — computes aggregate sum across all form instances

## Test Results

```
24080 passed | 226 failed (pre-existing, unrelated to this plan)
```

No regressions. All 7 converted rules did not break any existing tests.

## Self-Check: PASSED

- feat(12-02) commit exists: 176443a ✓
- core/validation/predicates.ts modified ✓
- core/validation/mod.ts modified ✓
- fpymt.ts, f1116.ts, f3468.ts, f9465.ts, f8814.ts, sse.ts modified ✓
