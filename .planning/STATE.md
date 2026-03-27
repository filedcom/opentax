---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: W-2 + Line 1a MVP
status: v1.0 milestone complete — archived
last_updated: "2026-03-27T00:00:00.000Z"
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 5
  completed_plans: 5
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-27)

**Core value:** Accurate, IRS-compliant computation: given a set of form inputs, produce the correct tax liability.
**Current focus:** Planning next milestone

## Current Status

- Milestone v1.0 — W-2 + Line 1a MVP: COMPLETE ✅
- Archived: `.planning/milestones/v1.0-ROADMAP.md`, `v1.0-REQUIREMENTS.md`, `v1.0-MILESTONE-AUDIT.md`
- Last action: Completed v1.0 milestone archival (2026-03-27)

## v1.0 Summary

All 3 phases complete, 5 plans, 49 tests passing:
- [x] Phase 1: Core Engine Foundation — Deno workspace, TaxNode, two-phase executor
- [x] Phase 2: W-2 + Line 1a Nodes — StartNode, W2Node, Line01zWagesNode, IRS fixture tests
- [x] Phase 3: CLI + Return Storage — create-return, form add, get-return

## Decisions (v1.0)

- TaxNode: generic abstract class `TaxNode<TSchema extends z.ZodTypeAny>` — enforces Zod at type level
- Two-phase executor: `buildExecutionPlan` (Kahn's BFS topo sort) + `execute` (pending dict accumulation)
- Scalar-to-array promotion: second deposit of same key → array concat (W-2 wages accumulation pattern)
- W2Node deposits wages as `[box1]` array — pending is always `number[]` after any number of W-2s
- Stable IDs: `{nodeType}_{padded-counter}` (w2_01, w2_02)
- CLI convention: `form add` wraps inner JSON with `{ [nodeType]: data }` before Zod validation
- Engine replay: `buildEngineInputs` groups by `nodeType + "s"` key (w2 → w2s)

## Tech Debt (v1.0)

- `Line01zWagesNode.compute()` discards computed total (`_total` unused, `outputs: []`) — get-return reads raw pending wages directly
- `buildEngineInputs` key convention (`nodeType + "s"`) fragile for form types with irregular plurals
- form-add wrapping convention implicit — must match each node's inputSchema top-level key

## Open Blockers

None.
