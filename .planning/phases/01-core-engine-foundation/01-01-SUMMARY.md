---
phase: 01-core-engine-foundation
plan: 01
subsystem: core
tags: [deno, typescript, zod, tax-engine, abstract-class]

# Dependency graph
requires: []
provides:
  - Deno workspace root with engine package configured
  - TaxNode abstract class with Zod-typed inputSchema and compute() contract
  - NodeOutput type (nodeType + input dict)
  - NodeResult type (outputs array)
  - NodeRegistry type (maps nodeType string to TaxNode instance)
  - engine/mod.ts public API barrel export
affects:
  - 01-02 (executor)
  - 02-w2-line1a (nodes)
  - 03-cli-storage (CLI)

# Tech tracking
tech-stack:
  added: [deno workspace, zod@^3.24, @filed/tax-engine package]
  patterns: [abstract TaxNode class, Zod-typed inputSchema, NodeResult/NodeOutput types]

key-files:
  created:
    - deno.json
    - engine/deno.json
    - engine/mod.ts
    - engine/core/types/tax-node.ts
    - engine/core/types/node-registry.ts
    - engine/core/types/tax-node.test.ts
  modified:
    - .gitignore

key-decisions:
  - "TaxNode is a generic abstract class parameterized by TSchema extends z.ZodTypeAny — enforces Zod at the type level"
  - "NodeOutput.input is Readonly<Record<string, unknown>> — immutable, flexible shape for arbitrary node payloads"
  - "NodeResult.outputs is readonly array — immutable contract for what compute() returns"
  - "NodeRegistry is Readonly<Record<string, TaxNode>> — maps nodeType strings to instances"

patterns-established:
  - "TaxNode pattern: all domain nodes extend TaxNode<Schema>, declare nodeType/inputSchema/outputNodeTypes/compute()"
  - "Zod as the single source of truth for input validation — inputSchema.safeParse() at runtime, z.infer<> for compile-time types"
  - "mod.ts barrel export pattern for @filed/tax-engine public API"

requirements-completed: [WS-01, WS-02, WS-03, CORE-01, CORE-02, CORE-03, CORE-04]

# Metrics
duration: 2min
completed: 2026-03-27
---

# Phase 1 Plan 01: Core Engine Foundation — Workspace + Type System Summary

**Deno workspace with @filed/tax-engine package, TaxNode abstract class using Zod-typed inputSchema, and NodeOutput/NodeResult/NodeRegistry types forming the engine's foundational type contract**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-27T00:28:26Z
- **Completed:** 2026-03-27T00:29:49Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Deno workspace root (`deno.json`) recognizes `engine` as workspace member
- `@filed/tax-engine` package configured with Zod dependency and `./mod.ts` exports entry point
- `TaxNode` abstract class established with Zod-typed `inputSchema`, enforcing type safety for all node implementations
- `NodeOutput`, `NodeResult`, `NodeRegistry` types provide the complete data flow contract
- 5 TDD tests verify instantiation, compute(), and schema validation (including rejection of invalid/missing fields)
- `deno check engine/` passes with zero type errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Deno workspace and engine package config** - `1a3561a` (chore)
2. **Task 2 RED: Add failing tests for TaxNode** - `7d04611` (test)
3. **Task 2 GREEN: Implement TaxNode, NodeOutput, NodeResult, NodeRegistry, mod.ts** - `7c22ff5` (feat)

**Plan metadata:** _(docs commit pending)_

_Note: TDD task has separate test commit (RED) and implementation commit (GREEN)_

## Files Created/Modified

- `deno.json` - Workspace root with `"workspace": ["engine"]`
- `engine/deno.json` - Package identity (`@filed/tax-engine`), version, exports, Zod import map
- `engine/mod.ts` - Public API barrel re-exporting TaxNode, NodeType, NodeOutput, NodeResult, NodeRegistry
- `engine/core/types/tax-node.ts` - TaxNode abstract class, NodeOutput, NodeResult, NodeType types
- `engine/core/types/node-registry.ts` - NodeRegistry type definition
- `engine/core/types/tax-node.test.ts` - 5 tests for MockAddNode (instantiation, compute, schema validation)
- `.gitignore` - Added `node_modules/` for Deno npm caching

## Decisions Made

- Used `readonly` on all NodeOutput/NodeResult fields to enforce immutability — aligns with CLAUDE.md immutability requirements
- TaxNode generic parameter defaults to `z.ZodTypeAny` so non-generic usage compiles without explicit type args
- `node_modules/` added to `.gitignore` because Deno caches npm packages there on first install

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Deno downloads Zod from npm automatically on first `deno check` or `deno test`.

## Next Phase Readiness

- TaxNode type contract is complete and tested — ready for executor implementation (phase 01-02)
- NodeRegistry type ready for assembling node instances
- All core type exports available via `@filed/tax-engine` package import
- No blockers for next plan

---
*Phase: 01-core-engine-foundation*
*Completed: 2026-03-27*

## Self-Check: PASSED

All files found:
- deno.json
- engine/deno.json
- engine/mod.ts
- engine/core/types/tax-node.ts
- engine/core/types/node-registry.ts
- engine/core/types/tax-node.test.ts
- .planning/phases/01-core-engine-foundation/01-01-SUMMARY.md

All commits found:
- 1a3561a (chore: workspace config)
- 7d04611 (test: RED phase)
- 7c22ff5 (feat: GREEN phase)
