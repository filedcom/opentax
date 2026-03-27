# Roadmap: Tax Engine — Filed Tax CLI

## Milestones

- ✅ **v1.0 W-2 + Line 1a MVP** — Phases 1-3 (shipped 2026-03-27)

## Phases

<details>
<summary>✅ v1.0 W-2 + Line 1a MVP (Phases 1-3) — SHIPPED 2026-03-27</summary>

- [x] Phase 1: Core Engine Foundation (2/2 plans) — completed 2026-03-27
- [x] Phase 2: W-2 + Line 1a Nodes (1/1 plans) — completed 2026-03-27
- [x] Phase 3: CLI + Return Storage (2/2 plans) — completed 2026-03-27

See: `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Core Engine Foundation | v1.0 | 2/2 | Complete | 2026-03-27 |
| 2. W-2 + Line 1a Nodes | v1.0 | 1/1 | Complete | 2026-03-27 |
| 3. CLI + Return Storage | v1.0 | 2/2 | Complete | 2026-03-27 |

### Phase 1: Implement tax graph view — static node graph traversal CLI command

**Goal:** Implement `computeTaxGraph` as a static metadata traversal of `outputNodeTypes` and expose it as `tax graph view --node_type <type> [--depth <n>] [--json]` in the CLI
**Requirements**: GRAPH-01 (pure traversal function), GRAPH-02 (cycle guard), GRAPH-03 (unregistered marker), GRAPH-04 (ASCII tree output), GRAPH-05 (JSON tree output), GRAPH-06 (CLI wiring)
**Depends on:** v1.0 (core engine, registry, CLI infrastructure)
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — TDD: computeTaxGraph pure function (graph traversal, cycle guard, depth limit) — completed 2026-03-27
- [x] 01-02-PLAN.md — CLI graph-view command (ASCII/JSON formatting, main.ts wiring)

---
*Roadmap created: 2026-03-27*
*Last updated: 2026-03-27 — Phase 01 Plan 01 complete: computeTaxGraph pure function*
