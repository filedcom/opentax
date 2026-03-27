---
phase: 01-implement-tax-graph-view-static-node-graph-traversal-cli-command
plan: "02"
subsystem: cli
tags: [deno, typescript, cli, ascii-tree, graph-traversal]

# Dependency graph
requires:
  - phase: 01-01
    provides: computeTaxGraph pure function + GraphNode type from engine/core/runtime/graph.ts

provides:
  - graphViewCommand function in engine/cli/commands/graph-view.ts
  - formatAsciiTree ASCII tree renderer with ├── / └── / │ connectors
  - graph view branch in engine/cli/main.ts (ASCII and JSON output modes)

affects: [any plan adding new CLI commands, any plan extending graph output formatting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ASCII tree rendering: recursive formatAsciiTree with prefix/isLast/isRoot flags"
    - "CLI dual-mode output: json=false logs directly to stdout, json=true returns value for runCommand"

key-files:
  created:
    - engine/cli/commands/graph-view.ts
    - engine/cli/commands/graph-view.test.ts
  modified:
    - engine/cli/main.ts

key-decisions:
  - "ASCII path calls graphViewCommand directly (not via runCommand) — printed to stdout, not JSON-stringified"
  - "JSON path wraps graphViewCommand in Promise.resolve + runCommand for consistent JSON envelope"
  - "formatAsciiTree is a pure function exported separately from graphViewCommand — enables isolated unit testing"

patterns-established:
  - "CLI command handlers are sync when their dependencies are sync (graphViewCommand does not need async)"
  - "depth=Infinity is the default — full tree traversal with no cap unless --depth flag is passed"

requirements-completed: [GRAPH-04, GRAPH-05, GRAPH-06]

# Metrics
duration: 2min
completed: "2026-03-27"
---

# Phase 01 Plan 02: Graph View CLI Command Summary

**`tax graph view --node_type <type>` CLI command with ASCII tree (├──/└──/│) and JSON output modes, wired to computeTaxGraph from Plan 01**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-27T16:22:01Z
- **Completed:** 2026-03-27T16:24:08Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- formatAsciiTree pure function renders GraphNode trees with proper box-drawing connectors (├──, └──, │), unregistered node markers, and correct indentation for nested trees
- graphViewCommand dispatches to ASCII (console.log) or JSON (return value) based on json flag, error propagation via thrown Error from computeTaxGraph
- engine/cli/main.ts extended with graph view branch: validates --node_type, parses --depth (string→number with Infinity default) and --json (boolean), and updated usage string

## Task Commits

Each task was committed atomically:

1. **Task 1: Write tests + implement graph-view command (TDD)** - `c22de3d` (feat)
2. **Task 2: Wire graph view into CLI main.ts** - `fc13ce2` (feat)

## Files Created/Modified

- `engine/cli/commands/graph-view.ts` - graphViewCommand and formatAsciiTree (65 lines)
- `engine/cli/commands/graph-view.test.ts` - 5 TDD tests: flat tree, nested tree, unregistered, json=false, json=true
- `engine/cli/main.ts` - added graphViewCommand import, depth/json parseArgs flags, graph+view branch, updated usage string

## Decisions Made

- ASCII path calls graphViewCommand directly (not via runCommand) — the output is a plain text tree, not a JSON envelope. runCommand would have wrapped it in JSON.stringify which breaks the tree format.
- JSON path uses `Promise.resolve(graphViewCommand(...))` inside runCommand — keeps the JSON output consistent with all other CLI commands (pretty-printed via JSON.stringify).
- formatAsciiTree is exported as a standalone pure function — enables unit testing the formatter in complete isolation from registry/computeTaxGraph.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None - graphViewCommand calls computeTaxGraph with the real registry; all output is live data.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `tax graph view --node_type start` produces a correct ASCII tree of the full node graph
- `tax graph view --node_type start --json` produces valid JSON tree for programmatic use
- `tax graph view --node_type start --depth 1` correctly limits traversal depth
- `tax graph view --node_type bogus` outputs error with valid types list
- All 62 engine tests pass (`deno test --allow-read --allow-write engine/`)

---
*Phase: 01-implement-tax-graph-view-static-node-graph-traversal-cli-command*
*Completed: 2026-03-27*
