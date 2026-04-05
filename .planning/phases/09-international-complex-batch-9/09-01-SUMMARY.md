---
phase: 09-international-complex-batch-9
plan: 01
subsystem: testing
tags: [deno, typescript, tax-nodes, international, f8854, f8873, f8288, f8621, f965, expatriation, firpta, pfic, section-965]

# Dependency graph
requires:
  - phase: 08-international-simple-batch-8
    provides: International simple node patterns (F8833, F8840, F8843, F8082, F8805)
provides:
  - "139 passing tests across 5 complex international nodes (f8854, f8873, f8288, f8621, f965)"
  - "All 5 nodes registered in registry.ts and mapped in screens.json"
  - "Research context.md files with IRS citations for all 5 nodes"
  - "f8288 FIRPTA withholding confirmed routing to f1040 line25b"
  - "f965 Section 965 installment tax confirmed routing to schedule2 line9"
affects: [10-xsd-validation-in-ci, 11-executor-error-isolation, 12-final-phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Verification-only plan pattern: gate check with node-scoped test runs"
    - "Phase 9 node-scoped exclusion: pre-existing MEF failures excluded from gate"

key-files:
  created: []
  modified: []

key-decisions:
  - "Phase 9 verification is node-scoped only — 139 passed / 0 failed is the correct gate; pre-existing MEF failures are unrelated"
  - "f8854 (expatriation) routes covered-expatriate gain to schedule2 via IRC §877A mark-to-market rules"
  - "f8873 (extraterritorial income) routes exclusion as negative schedule1 line8z_other_income per ETI exclusion sunset rules"
  - "f8288 (FIRPTA) routes withholding credit directly to f1040 line25b, not schedule3 — correct for withholding credits"
  - "f8621 (PFIC) routes excess distribution tax to schedule2, MTM gain/loss and QEF income to schedule1 — per IRC §1291/§1293/§1296"
  - "f965 (Section 965) routes current_year_installment to schedule2 line9_965_net_tax_liability per IRC §965(h)"

patterns-established:
  - "Complex international nodes: regime-based routing (f8621 uses three regimes: excess_distribution, MTM, QEF)"
  - "FIRPTA withholding credit: routes directly to f1040, not schedule3, for line25b credit reporting"
  - "Covered expatriate determination: any of three thresholds (avg annual tax >= $201k, net worth >= $2M, non-compliance)"

requirements-completed: [REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06]

# Metrics
duration: 1min
completed: 2026-04-05
---

# Phase 09 Plan 01: International Complex Batch 9 — Verification Summary

**5 complex international nodes (f8854, f8873, f8288, f8621, f965) gate-checked: 139 tests passing, type-safe, registered, and correctly routing FIRPTA withholding to f1040 and Section 965 installment tax to schedule2**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-05T20:54:02Z
- **Completed:** 2026-04-05T20:54:37Z
- **Tasks:** 2
- **Files modified:** 0 (verification-only plan)

## Accomplishments

- Ran all 5 node test suites in one command: 139 tests, 0 failures, 138ms execution time
- Confirmed `deno check forms/f1040/2025/registry.ts` exits 0 — no type errors
- Audited all 5 nodes: imported in registry.ts (10 matches = 5 imports + 5 array refs), mapped in screens.json, research/context.md present with IRS citations
- Confirmed f8288 FIRPTA routes to `OutputNodes([f1040])` for line25b withholding credit
- Confirmed f965 Section 965 routes to `OutputNodes([schedule2])` for line9 installment tax
- Confirmed f8854 expatriation routes to schedule2, f8873 extraterritorial income routes to schedule1, f8621 PFIC routes to both schedule1 and schedule2 depending on regime

## Task Commits

This plan was verification-only — no new code was written, so no task commits were created. All nodes were previously implemented.

**Plan metadata:** (see final commit below)

## Files Created/Modified

None — verification-only plan confirmed pre-built nodes meet all criteria.

## Decisions Made

- Phase 9 verification is node-scoped only — 139 passed / 0 failed is the correct gate; pre-existing MEF failures in the full suite are unrelated to these 5 nodes (consistent with Phase 5, 6, 7, 8 decisions)
- f8288 direct routing to f1040 (not schedule3) is correct: FIRPTA withholding is a credit reported on Form 1040 line 25b, not on Schedule 3 Part II (which handles other credits)
- f8621 regime-based routing is correct per IRC: excess distribution regime → schedule2 (tax at highest rate), MTM regime → schedule1 (mark-to-market gain/loss as ordinary income), QEF regime → schedule1 (ordinary income + capital gain inclusion)

## Deviations from Plan

None — plan executed exactly as written. All 5 nodes were already production-ready.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 5 complex international nodes confirmed production-ready
- Phase 9 gate check complete — ready to proceed to Phase 10 (XSD Validation in CI) or Phase 11/12
- No blockers or concerns

---
*Phase: 09-international-complex-batch-9*
*Completed: 2026-04-05*
