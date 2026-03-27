---
phase: 03-cli-return-storage
plan: "01"
subsystem: database
tags: [deno, typescript, file-persistence, json, store, w2]

requires:
  - phase: 02-w2-line1a-nodes
    provides: W2Node, Line01zWagesNode, executor and planner runtime

provides:
  - engine/cli/store/types.ts — MetaJson and InputEntry type definitions
  - engine/cli/store/store.ts — nextId, createReturn, loadMeta, loadInputs, appendInput utilities
  - W2Node deposits wages as [box1] single-element array enabling reliable array accumulation
  - engine/deno.json updated with @std/fs, @std/cli, @std/path imports and tax task

affects: [03-02-cli-commands, any future CLI command that reads/writes return data]

tech-stack:
  added: ["@std/fs (ensureDir)", "@std/cli", "@std/path"]
  patterns: ["file-based return storage with meta.json + inputs.json", "immutable appendInput pattern", "per-nodeType stable ID generation"]

key-files:
  created:
    - engine/cli/store/types.ts
    - engine/cli/store/store.ts
    - engine/cli/store/store.test.ts
  modified:
    - engine/nodes/2025/source-docs/w2/index.ts
    - engine/nodes/2025/source-docs/w2/index.test.ts
    - engine/nodes/2025/lines/line_01z_wages/index.test.ts
    - engine/deno.json

key-decisions:
  - "W2Node deposits wages as [box1] (array) so mergePending always accumulates arrays; single W-2 pending wages is [85000] not scalar 85000"
  - "Store tests require --allow-read --allow-write flags; added test/test:cli tasks to engine/deno.json for convenience"
  - "appendInput is immutable: reads existing array, creates new [...existing, entry] array, writes back — never mutates in place"
  - "Stable IDs use padded 2-digit counter per nodeType: w2_01, w2_02, 1099int_01"

patterns-established:
  - "Store I/O pattern: readTextFile → JSON.parse → modify immutably → JSON.stringify(data, null, 2) → writeTextFile"
  - "Error handling: catch Deno.errors.NotFound and rethrow with descriptive message including the path"
  - "Test isolation: Deno.makeTempDir() per test for complete filesystem isolation"

requirements-completed: [STORE-01, STORE-02, STORE-03, CLI-04]

duration: 12min
completed: 2026-03-27
---

# Phase 03 Plan 01: Return Storage + W2Node Array Fix Summary

**File-based return storage (meta.json + inputs.json) with UUID return IDs and per-type stable entry IDs, plus W2Node updated to deposit wages as [box1] array enabling reliable accumulation**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-27T00:00:00Z
- **Completed:** 2026-03-27
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- W2Node now deposits `wages: [input.w2.box1]` — single W-2 produces `[85000]` in pending, two W-2s accumulate `[85000, 45000]` via mergePending concat
- `engine/cli/store/types.ts` exports `MetaJson` and `InputEntry` immutable types
- `engine/cli/store/store.ts` exports 5 utilities: `nextId` (pure), `createReturn`, `loadMeta`, `loadInputs`, `appendInput`
- 13 new store tests cover all behaviors; all 37 tests (existing 24 + new 13) pass
- `engine/deno.json` updated with `@std/fs`, `@std/cli`, `@std/path` and `deno task tax` entry point

## Task Commits

Each task was committed atomically:

1. **Task 1: W2Node array deposit fix** - `8706b42` (feat)
2. **Task 2: Return storage types + persistence utilities + tests** - `ca0c903` (feat)

## Files Created/Modified
- `engine/nodes/2025/source-docs/w2/index.ts` - Changed `wages: input.w2.box1` to `wages: [input.w2.box1]`
- `engine/nodes/2025/source-docs/w2/index.test.ts` - Updated assertions to expect array `[85000]`
- `engine/nodes/2025/lines/line_01z_wages/index.test.ts` - Updated single W-2 test to expect `[85000]`
- `engine/cli/store/types.ts` - MetaJson and InputEntry type definitions
- `engine/cli/store/store.ts` - nextId, createReturn, loadMeta, loadInputs, appendInput
- `engine/cli/store/store.test.ts` - 13 tests for all store operations
- `engine/deno.json` - Added @std/fs, @std/cli, @std/path imports and tax/test tasks

## Decisions Made
- W2Node array deposit: chosen to ensure `pending["line_01z_wages"]["wages"]` is always `number[]` after any number of W-2s, so CLI can call `.reduce((a,b) => a+b, 0)` without type-checking
- Deno.makeTempDir() per test: each test gets fully isolated filesystem state, no cleanup needed
- Immutable appendInput: reads existing, creates `[...existing, entry]`, writes back — consistent with project-wide immutability rule
- Added test tasks to deno.json: `deno test engine/cli/` requires `--allow-read --allow-write` flags; added convenience tasks to avoid flag memorization

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] File paths differed from plan — used actual paths**
- **Found during:** Task 1 (initial file discovery)
- **Issue:** Plan referenced `engine/nodes/2025/inputs/w2/` and `engine/nodes/2025/form_1040/line_01z_wages/` but actual paths are `engine/nodes/2025/source-docs/w2/` and `engine/nodes/2025/lines/line_01z_wages/`
- **Fix:** Used actual filesystem paths throughout; no code structure change needed
- **Files modified:** None — adaptation only
- **Verification:** All tests found and executed correctly
- **Committed in:** 8706b42 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added test tasks to engine/deno.json**
- **Found during:** Task 2 (store test execution)
- **Issue:** `deno test engine/cli/` fails without `--allow-read --allow-write` flags; plan's verify command would fail without flags
- **Fix:** Added `"test"` and `"test:cli"` tasks to deno.json with proper flags
- **Files modified:** engine/deno.json
- **Verification:** `deno test --allow-read --allow-write engine/cli/` passes all 13 tests
- **Committed in:** ca0c903 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 path adaptation, 1 missing critical)
**Impact on plan:** Both adaptations necessary for correct execution. No scope creep.

## Issues Encountered
- Deno test permissions: store tests use `Deno.makeTempDir()` and file I/O, requiring `--allow-read --allow-write` flags. The "nonexistent path" error tests verify `Deno.errors.NotFound` is caught and re-thrown with descriptive messages — this only works correctly when read permission is granted.

## Known Stubs
None — all store functions are fully implemented. No placeholder returns or hardcoded data.

## Next Phase Readiness
- Store module is ready for CLI commands (plan 03-02) to consume
- `createReturn` creates the return directory structure
- `appendInput` + `nextId` are the building blocks for `form add` command
- `loadMeta` + `loadInputs` are the building blocks for `get-return` command
- W2Node array wages means `pending["line_01z_wages"]["wages"]` is always `number[]`, ready for CLI line_1a extraction

---
*Phase: 03-cli-return-storage*
*Completed: 2026-03-27*
