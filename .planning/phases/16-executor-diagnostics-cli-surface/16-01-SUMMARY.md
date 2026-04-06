---
phase: 16-executor-diagnostics-cli-surface
plan: 01
subsystem: cli
tags: [executor, diagnostics, cli, mef, xsd, validation]

requires:
  - phase: 11-executor-diagnostics
    provides: "ExecutorDiagnosticEntry type and result.diagnostics field on ExecuteResult"
  - phase: 14-xsd-e2e
    provides: "forms/f1040/e2e/xsd_validation.test.ts (6 tests)"
provides:
  - "return.ts surfaces EXECUTOR_NODE_FAILURE entries in warnings array"
  - "validate.ts merges executor diagnostics into DiagnosticsReport with reject severity"
  - "export.ts emits console.warn for executor node failures before XML build"
  - "validate:mef task now runs both XSD test files (10 tests total)"
affects: [cli, mef-export, validation-report]

tech-stack:
  added: []
  patterns:
    - "Executor diagnostics consumed at CLI boundary — never silently dropped"
    - "DiagnosticEntry mapping: ExecutorDiagnosticEntry → reject-severity with formRef=nodeId"

key-files:
  created: []
  modified:
    - cli/commands/return.ts
    - cli/commands/validate.ts
    - cli/commands/export.ts
    - deno.json

key-decisions:
  - "executor diagnostics mapped to reject severity in DiagnosticsReport so node failures block filing"
  - "summary.rejected and summary.total incremented when executor entries merged — canFile forced false"
  - "validate:mef task extended with e2e xsd_validation.test.ts; pre-existing XSD failures are known and tracked"

patterns-established:
  - "Pattern: read result.diagnostics immediately after execute() in all CLI commands"
  - "Pattern: ExecutorDiagnosticEntry → DiagnosticEntry mapping uses code as ruleNumber, nodeId as formRef"

requirements-completed: [REQ-EXEC-01]

duration: 15min
completed: 2026-04-06
---

# Phase 16 Plan 01: Executor Diagnostics CLI Surface Summary

**Executor node failures now surface as warnings in return output, reject-severity entries in validation reports, and stderr warnings in export — closing the silent-failure gap from Phase 11**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-06T00:00:00Z
- **Completed:** 2026-04-06T00:15:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- All three CLI commands (return, validate, export) now read `result.diagnostics` after `execute()`
- `validate.ts` merges executor entries as `reject`-severity `DiagnosticEntry` items, recalculates summary counts, and forces `canFile=false`
- `export.ts` emits a `console.warn` per executor failure plus a summary warning before XML build begins
- `validate:mef` deno task extended to include the Phase 14 e2e XSD test file (10 total tests running)
- `predicates.test.ts` confirmed on disk with 22 passing tests

## Task Commits

1. **Task 1: Wire executor diagnostics into all three CLI commands** - `580ac7f` (feat)
2. **Task 2: Update validate:mef task and verify predicates.test.ts** - `5c12cfa` (chore)
3. **Task 3: Full test suite gate** - (verification task, no code changes)

## Files Created/Modified

- `cli/commands/return.ts` - Appends `[EXECUTOR_NODE_FAILURE] nodeType: message` strings to warnings array
- `cli/commands/validate.ts` - Imports `ExecutorDiagnosticEntry` and `ErrorCategory`; merges executor entries into DiagnosticsReport
- `cli/commands/export.ts` - Emits `console.warn` for each executor diagnostic and a summary count warning
- `deno.json` - `validate:mef` task now includes `forms/f1040/e2e/xsd_validation.test.ts`

## Decisions Made

- Executor diagnostics mapped to `reject` severity (not `alert`) so node failures always block filing via `canFile=false`.
- `mergedReport.summary.rejected` and `.total` incremented by executor entry count — keeps summary counts accurate.
- `console.warn` chosen for export.ts (matches existing alert/reject warn pattern in the same file).

## Deviations from Plan

### Minor Type-Safety Fix

**1. [Rule 1 - Bug] Used actual DiagnosticsSummary field names (`rejected`, `total`) instead of plan's incorrect names**

- **Found during:** Task 1 (validate.ts implementation)
- **Issue:** Plan specified `rejectCount` and `totalCount` but `DiagnosticsSummary` interface uses `rejected` and `total`
- **Fix:** Used correct field names from the interface
- **Files modified:** cli/commands/validate.ts
- **Verification:** `deno check cli/commands/validate.ts` exits 0
- **Committed in:** 580ac7f

---

**Total deviations:** 1 auto-fixed (Rule 1 - type name correction)
**Impact on plan:** Necessary for type safety; no behavior change.

## Issues Encountered

- Full `deno task test` suite shows 97 pre-existing failures (builder.test.ts + XSD validation tests) unrelated to this plan's changes. All 87 CLI tests pass cleanly. These failures pre-date this plan and are tracked as known issues.
- `deno task test` also discovers tests in `.claude/worktrees/` — the worktree path inflates the reported failure count (333 total vs 97 when excluded). This is a pre-existing configuration issue.

## Next Phase Readiness

- Executor diagnostics are now fully integrated at the CLI surface layer
- Any node failure will be visible to users through all three CLI workflows
- Phase 17 (if planned) can focus on improving executor error messages or adding recovery strategies

---
*Phase: 16-executor-diagnostics-cli-surface*
*Completed: 2026-04-06*
