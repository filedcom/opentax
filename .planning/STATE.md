---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: milestone
status: Ready to execute
stopped_at: Completed 03-02-PLAN.md — Phase 3 test verification (128 tests pass)
last_updated: "2026-04-05T17:31:46.026Z"
progress:
  total_phases: 12
  completed_phases: 6
  total_plans: 11
  completed_plans: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** Pure transformation nodes — IRS-compliant, schema-first, tested
**Current focus:** Phase 03 — special-situations-a-batch-3

## Current Position

Phase: 03 (special-situations-a-batch-3) — EXECUTING
Plan: 3 of 3

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

## Accumulated Context

| Phase 01-self-employed-retirement-batch-1 P01 | 4 | 2 tasks | 6 files |
| Phase 01-self-employed-retirement-batch-1 P02 | 15 | 2 tasks | 2 files |
| Phase 02-deductions-worksheets-batch-2 P01 | 162 | 2 tasks | 3 files |
| Phase 04-special-situations-b-batch-4 P01 | 3 | 2 tasks | 0 files |
| Phase 05-specialty-credits-a-batch-5 P01 | 5 | 2 tasks | 0 files |
| Phase 10-xsd-validation-in-ci-xmllint-against-irs-xsd-files-wire-into-deno-test-suite P01 | 120 | 2 tasks | 11 files |
| Phase 11-executor-error-isolation P01 | 264 | 2 tasks | 2 files |
| Phase 03-special-situations-a-batch-3 P01 | 2 | 1 tasks | 0 files |
| Phase 03-special-situations-a-batch-3 P02 | 1 | 1 tasks | 0 files |

### Decisions

- Initial: Use build-tax-node skill for every node (Research → Tests → Implementation)
- Initial: 5 nodes per phase, 9 phases total (~45 nodes)
- Initial: workflow.skip_discuss=true — ROADMAP phase goals serve as specs
- [Phase 01-self-employed-retirement-batch-1]: SEP/Solo 401k annual limit is ,000 for TY2025 (Rev Proc 2024-40 §3.20)
- [Phase 01-self-employed-retirement-batch-1]: LTC premium age limits use §3.34 values: 61-70=,770, 71+=,970 (Rev Proc 2024-40)
- [Phase 01-self-employed-retirement-batch-1]: nol_carryforward uses existing schedule1.line8a_nol_deduction — no schema extension needed
- [Phase 01-self-employed-retirement-batch-1]: nol_carryforward routes only to schedule1.line8a_nol_deduction; no agi_aggregator extension needed per per-node context.md
- [Phase 01-self-employed-retirement-batch-1]: f2106 enum uses SNAKE_CASE values (RESERVIST, PERFORMING_ARTIST, FEE_BASIS_OFFICIAL, DISABLED_IMPAIRMENT)
- [Phase 02-deductions-worksheets-batch-2]: method field kept as UI hint only; depletionDeduction() always computes Math.max(cost, pct) per IRC §611
- [Phase 04-special-situations-b-batch-4]: F8917 correct behavior for TY2025 is no output — IRC §222 repealed by P.L. 116-260 after TY2020; ROADMAP 'routes to schedule1' criterion is stale
- [Phase 05-specialty-credits-a-batch-5]: Phase 5 verification is node-scoped only — full suite has 59 pre-existing MEF failures unrelated to Phase 5; 108 passed / 0 failed is the correct gate
- [Phase 10]: IRS1040 always emits required XSD fields (IndividualReturnFilingStatusCd, VirtualCurAcquiredDurTYInd, RefundProductCd) regardless of income data
- [Phase 10]: f8959 builder returns empty string — IRS8959 requires nested AdditionalTaxGrp structure; deferred to future plan
- [Phase 11-executor-error-isolation]: Empty pending + parse failure = silent skip (backward compatible); non-empty pending + parse failure = EXECUTOR_NODE_FAILURE diagnostic
- [Phase 03-special-situations-a-batch-3]: All 5 Phase 3 node research files confirmed complete — no remediation needed
- [Phase 03-special-situations-a-batch-3]: 03-02 is a verification-only plan — all 5 Phase 3 nodes (clergy, f8915f, f8915d, f5405, household_wages) had 128 passing tests from prior work; no new code written

### Roadmap Evolution

- Phase 10 added: XSD Validation in CI — xmllint against IRS XSD files (.research/docs/IMF_Series_2025v3.0/), wire into Deno test suite so XSD failures surface as test failures. Covers Form 1040 and Schedule 1 at minimum; catches namespace, element ordering, and type mismatches before IRS submission.

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260401-59f | Write CRITIQUE.md: deep production-readiness and IRS MEF certification assessment of the tax codebase | 2026-04-01 | e1b1ee6 | [260401-59f-write-critique-md-deep-production-readin](.planning/quick/260401-59f-write-critique-md-deep-production-readin/) |
| 260401-wdm | Phase 3 Special Situations A node audit: fix f5405 + household_wages to use output() helper, verify clergy/f8915f/f8915d routing | 2026-04-01 | db86742 | [260401-wdm-phase-3-special-situations-a-node-audit-](.planning/quick/260401-wdm-phase-3-special-situations-a-node-audit-/) |

## Session Continuity

Last session: 2026-04-05T17:31:46.024Z
Stopped at: Completed 03-02-PLAN.md — Phase 3 test verification (128 tests pass)
Resume file: None
