---
phase: 03-cli-return-storage
plan: "02"
subsystem: cli
tags: [deno, typescript, cli, parseArgs, zod, file-io]

requires:
  - phase: 03-01
    provides: store.ts (createReturn, loadMeta, loadInputs, appendInput, nextId) and types.ts
  - phase: 02-01
    provides: W2Node, Line01zWagesNode, StartNode, registry, buildExecutionPlan, execute
provides:
  - CLI entry point at engine/cli/main.ts routing create-return, form add, get-return
  - createReturnCommand — scaffolds returns/{id}/ with meta.json + empty inputs.json
  - formAddCommand — validates W-2 data via W2Node.inputSchema, assigns stable IDs, appends to inputs.json
  - getReturnCommand — replays engine from inputs.json, returns line_1a total
affects: [future-cli-extensions, additional-form-types, phase-04]

tech-stack:
  added: ["@std/cli parseArgs"]
  patterns:
    - "CLI command functions are pure async functions with typed args and results"
    - "formAddCommand wraps user data with nodeType key before passing to inputSchema.safeParse"
    - "buildEngineInputs maps nodeType -> plural key (w2->w2s) for engine replay"
    - "TDD: tests written first against stub, implementation then makes them GREEN"

key-files:
  created:
    - engine/cli/main.ts
    - engine/cli/commands/create-return.ts
    - engine/cli/commands/create-return.test.ts
    - engine/cli/commands/form-add.ts
    - engine/cli/commands/form-add.test.ts
    - engine/cli/commands/get-return.ts
    - engine/cli/commands/get-return.test.ts
  modified: []

key-decisions:
  - "formAddCommand wraps { box1: 85000 } as { w2: { box1: 85000 } } before Zod validation — matches W2Node inputSchema shape"
  - "buildEngineInputs appends 's' to nodeType for engine key (w2->w2s) — extensible convention needing no code changes for new form types"
  - "get-return.ts initially created as stub to allow main.ts type-checking before Task 2 implementation"
  - "getReturnCommand handles both array and scalar wages in pending to be defensive against future executor changes"

patterns-established:
  - "Command pattern: each CLI subcommand is an exported async function with typed Args and Result types"
  - "Validation wrapping: user provides inner data (box1: N), CLI wraps with nodeType key for schema matching"
  - "Engine replay: buildEngineInputs -> buildExecutionPlan -> execute -> extract from pending"

requirements-completed: [CLI-01, CLI-02, CLI-03, CLI-05]

duration: 2min
completed: 2026-03-27
---

# Phase 3 Plan 02: CLI Commands Summary

**`deno task tax` CLI with create-return, form add (Zod-validated), and get-return (engine replay) — single W-2 yields line_1a=85000, two W-2s yield 130000**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-27T01:23:26Z
- **Completed:** 2026-03-27T01:25:37Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- CLI entry point at `engine/cli/main.ts` using `@std/cli parseArgs` routing three subcommands
- `createReturnCommand` wraps store's `createReturn` and returns `{ returnId }`
- `formAddCommand` parses JSON, wraps with nodeType key, validates via `node.inputSchema.safeParse`, assigns stable ID, appends
- `getReturnCommand` groups inputs by nodeType to plural key, replays engine, extracts `line_1a` from pending wages array
- 12 tests (3 create-return + 5 form-add + 4 get-return) all pass; total 49 engine tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: CLI entry point + create-return and form-add commands** - `30ccb17` (feat)
2. **Task 2: get-return command with engine replay + end-to-end tests** - `a0ee97d` (feat)

**Plan metadata:** (docs commit — see final commit)

_Note: TDD tasks had test commit included in same feat commit per single-task-per-commit protocol_

## Files Created/Modified

- `engine/cli/main.ts` - CLI entry point, parseArgs routing for create-return / form add / get-return
- `engine/cli/commands/create-return.ts` - createReturnCommand wrapping store.createReturn
- `engine/cli/commands/create-return.test.ts` - 3 tests (meta fields, empty inputs.json, returnId type)
- `engine/cli/commands/form-add.ts` - formAddCommand with JSON parse, Zod validation, nextId, appendInput
- `engine/cli/commands/form-add.test.ts` - 5 tests (valid append, two appends, missing field, bad JSON, unknown nodeType)
- `engine/cli/commands/get-return.ts` - getReturnCommand with buildEngineInputs + engine replay + line_1a extraction
- `engine/cli/commands/get-return.test.ts` - 4 tests (single W-2, two W-2s, empty return, nonexistent ID)

## Decisions Made

- `formAddCommand` receives user-supplied inner object `{ box1: 85000 }` and wraps it as `{ w2: { box1: 85000 } }` before passing to `W2Node.inputSchema.safeParse` — the schema expects the outer wrapper key
- `buildEngineInputs` appends `s` to nodeType to form engine key (`w2` -> `w2s`) — simple, extensible convention; new form types work automatically
- `getReturnCommand` handles both array and scalar wages in pending dict for defensive correctness

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all tests passed on first GREEN implementation run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full end-to-end CLI working: `deno task tax create-return --year 2025` -> `deno task tax form add ...` -> `deno task tax get-return {id}`
- W-2 + line_1a MVP complete
- Architecture is open for additional form types (1099-INT, etc.) without changes to CLI routing or engine replay patterns
- No blockers for next phase

---
*Phase: 03-cli-return-storage*
*Completed: 2026-03-27*
