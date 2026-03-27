# Roadmap: Tax Engine — W-2 + Line 1a MVP

## Overview

Three phases to go from empty repo to a working CLI that accepts a W-2, computes line 1a (total wages), and returns JSON. Phase 1 lays the foundation — workspace, types, and the two-phase executor. Phase 2 builds the three nodes needed for W-2 → line 1a computation with IRS fixture tests. Phase 3 wires up the CLI with file-based return storage. End state: `tax form add ... w2` + `tax get-return` produces correct IRS-compliant line 1a output.

## Phases

- [ ] **Phase 1: Core Engine Foundation** — Deno workspace, TaxNode types, two-phase executor
- [ ] **Phase 2: W-2 + Line 1a Nodes** — start/w2/line_01z_wages nodes with IRS tests
- [ ] **Phase 3: CLI + Return Storage** — create-return, form add, get-return commands

## Phase Details

### Phase 1: Core Engine Foundation

**Goal**: Deno workspace is set up; TaxNode abstract class, NodeResult/NodeOutput types, and the two-phase executor (planner + executor) are implemented and tested.

**Depends on**: Nothing (first phase)

**Requirements**: WS-01, WS-02, WS-03, CORE-01, CORE-02, CORE-03, CORE-04, EXEC-01, EXEC-02, EXEC-03, EXEC-04

**Success Criteria** (what must be TRUE):
1. `deno check engine/` passes with no type errors
2. A minimal TaxNode subclass can be instantiated and its `compute()` called
3. The executor correctly runs a 2-node DAG (mock nodes) in topo order and accumulates outputs via pending dict
4. Optional nodes with no deposited inputs are silently skipped
5. `deno test engine/` passes all executor unit tests

**Plans**: 2 plans

Plans:
- [x] 01-01: Workspace setup — deno.json workspace root, engine/deno.json, engine/mod.ts, core types (TaxNode, NodeOutput, NodeResult, NodeRegistry)
- [ ] 01-02: Two-phase executor — planner.ts (expand instances + topo sort) + executor.ts (pending dict accumulation) with unit tests

---

### Phase 2: W-2 + Line 1a Nodes

**Goal**: Three nodes implemented and tested: `start` (dispatches W-2 instances), `w2` (validates + deposits wages), `line_01z_wages` (sums all wages → line 1a). IRS fixture tests confirm correctness.

**Depends on**: Phase 1

**Requirements**: NODE-01, NODE-02, NODE-03, NODE-04, NODE-05

**Success Criteria** (what must be TRUE):
1. Single W-2 with box1=$85,000 → line_01z_wages outputs $85,000
2. Two W-2s (box1=$85,000 + $45,000) → line_01z_wages outputs $130,000
3. Missing required W-2 field (box1) causes Zod parse failure / node skip
4. `deno test engine/nodes/` passes all fixture tests
5. `deno check` still passes

**Plans**: 1 plan

Plans:
- [ ] 02-01: Three nodes + fixture tests — start/2025/index.ts, inputs/w2/2025/index.ts + index.test.ts, form_1040/line_01z_wages/2025/index.ts + index.test.ts, registry.ts wiring all three

---

### Phase 3: CLI + Return Storage

**Goal**: Working `tax` CLI. `create-return` scaffolds a return directory, `form add` validates and appends W-2 data, `get-return` replays the engine from inputs.json and outputs JSON with line_1a total.

**Depends on**: Phase 2

**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, CLI-05, STORE-01, STORE-02, STORE-03

**Success Criteria** (what must be TRUE):
1. `tax create-return --year 2025` creates `returns/{id}/meta.json` and `returns/{id}/inputs.json`
2. `tax form add --return_id {id} --node_type w2 '{"box1": 85000}'` appends to inputs.json with stable ID (w2_01)
3. `tax form add` with missing `box1` prints a clear validation error and exits non-zero
4. `tax get-return {id}` outputs JSON including `line_1a: 85000`
5. Adding a second W-2 and re-running `get-return` outputs `line_1a: 130000`

**Plans**: 2 plans

Plans:
- [ ] 03-01: Return storage — returns/ directory conventions, meta.json schema, inputs.json schema, stable ID assignment, load/save utilities
- [ ] 03-02: CLI commands — cli.ts entry point, create-return, form add (validate + append), get-return (replay + output JSON)

---

## Milestone Summary

**Milestone 1 complete when:** `tax form add --return_id {id} --node_type w2 '{"box1": 85000}'` followed by `tax get-return {id}` outputs `{"line_1a": 85000}` with passing tests and no type errors.

---
*Roadmap created: 2026-03-27*
*Last updated: 2026-03-27 after initialization*
