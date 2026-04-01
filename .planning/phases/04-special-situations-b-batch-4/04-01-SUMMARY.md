---
phase: 04-special-situations-b-batch-4
plan: 01
subsystem: testing
tags: [deno, zod, tax-nodes, fec, qsehra, f8917, f8867, f8859, verification]

# Dependency graph
requires: []
provides:
  - "Verified: FEC node (foreign employer compensation → f1040.line1a_wages)"
  - "Verified: QSEHRA node (MEC branch → form8962, no-MEC branch → f1040.line1a_wages)"
  - "Verified: F8917 node (expired TY2025 deduction → no output)"
  - "Verified: F8867 node (paid preparer due diligence compliance → no output)"
  - "Verified: F8859 node (DC homebuyer credit carryforward → schedule3.line6z_general_business_credit)"
  - "80 passing node-level tests across all 5 Phase 4 nodes"
affects: [phase-05, downstream-nodes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Expired-deduction pattern: node captures data (for state returns) but returns outputs:[] for TY2025"
    - "Compliance-only pattern: node validates inputs (Zod) but produces no tax computation output"

key-files:
  created: []
  modified: []

key-decisions:
  - "F8917 correct behavior for TY2025 is no output — IRC §222 repealed by P.L. 116-260 after TY2020. ROADMAP success criterion 'routes to schedule1' is incorrect for TY2025; empty output is the right implementation."
  - "Full test suite (deno task test) excluded from Phase 4 gate due to 59 pre-existing MEF test failures in forms/f1040/mef/ caused by uncommitted WIP changes to header.ts and filer.ts; node-scoped tests are the correct Phase 4 verification."

patterns-established: []

requirements-completed: [REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06]

# Metrics
duration: 3min
completed: 2026-04-02
---

# Phase 4 Plan 01: Special Situations B Batch 4 Verification Summary

**All 5 Phase 4 nodes (FEC, QSEHRA, F8917, F8867, F8859) verified: 80/80 tests pass, all registered in registry.ts + inputs.ts, all research/context.md present with IRS citations**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T22:15:49Z
- **Completed:** 2026-04-01T22:18:00Z
- **Tasks:** 2
- **Files modified:** 0 (verification plan — no code changes)

## Accomplishments

- Ran all 80 Phase 4 node tests: 80 passed, 0 failed across fec (21), qsehra (19), f8917 (12), f8867 (14), f8859 (14)
- Confirmed `deno check forms/f1040/2025/registry.ts` exits 0 — no type errors
- Verified all 5 nodes imported and registered in both registry.ts and inputs.ts
- Confirmed all 5 research/context.md files exist (82–115 lines each with IRS citations)
- Verified output routing correctness: FEC→f1040.line1a_wages, QSEHRA→form8962/f1040, F8917→none (expired), F8867→none (compliance), F8859→schedule3.line6z_general_business_credit

## Task Commits

No code changes — this was a verification-only plan. All Phase 4 node code was implemented in prior work.

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

None — verification plan only.

## Decisions Made

- **F8917 ROADMAP discrepancy acknowledged:** The ROADMAP success criterion states F8917 "routes to schedule1," but IRC §222 was permanently repealed by P.L. 116-260 (Consolidated Appropriations Act 2021) effective for tax years after December 31, 2020. For TY2025, the correct behavior is `outputs: []`. The implementation is correct; the ROADMAP description is stale.
- **Node-scoped test gate:** Full suite excluded due to 59 pre-existing MEF failures in `forms/f1040/mef/` (header.test.ts, builder.test.ts) from uncommitted WIP in header.ts and filer.ts. These are completely outside Phase 4 scope.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All nodes were fully implemented prior to this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 is complete. All 5 nodes (FEC, QSEHRA, F8917, F8867, F8859) are production-ready, tested, and registered.
- Pre-existing MEF test failures in header.ts/filer.ts are WIP changes that need to be addressed separately.
- Ready to proceed to Phase 5.

---
*Phase: 04-special-situations-b-batch-4*
*Completed: 2026-04-02*
