# Requirements: Tax Engine — W-2 + Line 1a MVP

**Defined:** 2026-03-27
**Core Value:** Accurate, IRS-compliant computation: given a set of form inputs, produce the correct tax liability.

## v1 Requirements

Scope: one W-2 → line 1a of 1040. End-to-end working CLI.

### Workspace

- [x] **WS-01**: Deno workspace root with `engine` package configured
- [x] **WS-02**: Engine package exports public API via `mod.ts`
- [x] **WS-03**: `deno check` passes with no type errors

### Core Types

- [x] **CORE-01**: `TaxNode` abstract class with `nodeType`, `inputSchema` (Zod), `outputNodeTypes`, `compute()`
- [x] **CORE-02**: `NodeOutput` type (`nodeType` + `input` dict)
- [x] **CORE-03**: `NodeResult` type (`outputs: NodeOutput[]`)
- [x] **CORE-04**: `NodeRegistry` type mapping nodeType → TaxNode instance

### Executor

- [ ] **EXEC-01**: Phase 1 planner: expand node instances from inputs.json, topological sort
- [ ] **EXEC-02**: Phase 2 executor: execute in topo order, accumulate via pending dict (arrays append, scalars set)
- [ ] **EXEC-03**: Optional nodes (no inputs deposited) are silently skipped
- [ ] **EXEC-04**: Engine is stateless — full recompute by replaying inputs.json

### Nodes

- [ ] **NODE-01**: `start` node (2025): dispatches each W-2 entry as a separate instance to `w2` node
- [ ] **NODE-02**: `w2` node (2025): inputSchema validates W-2 box 1 (wages); deposits wages into `line_01z_wages`
- [ ] **NODE-03**: `line_01z_wages` node (2025): sums all deposited wages arrays → total line 1a amount
- [ ] **NODE-04**: IRS fixture tests for `w2` node (single W-2, known box 1 → known line 1a contribution)
- [ ] **NODE-05**: IRS fixture tests for `line_01z_wages` node (multiple W-2s → correct sum)

### CLI

- [ ] **CLI-01**: `tax create-return --year 2025` creates `returns/{id}/meta.json` + empty `inputs.json`
- [ ] **CLI-02**: `tax form add --return_id {id} --node_type w2 '{...}'` validates against W-2 inputSchema, appends to inputs.json
- [ ] **CLI-03**: `tax get-return {id}` re-runs engine from inputs.json, outputs computed result as JSON (includes line_1a total)
- [ ] **CLI-04**: Validation error on incomplete W-2 input (missing required fields)
- [ ] **CLI-05**: Conflict error if duplicate singular form types (not applicable for W-2 which is array-type, but error handling for malformed JSON)

### Return Storage

- [ ] **STORE-01**: `meta.json` contains: returnId, year, createdAt
- [ ] **STORE-02**: `inputs.json` contains array of node inputs with stable IDs
- [ ] **STORE-03**: `form add` assigns stable ID to each input (e.g., `w2_01`, `w2_02`)

## v2 Requirements

### Additional Nodes

- **NODE-V2-01**: Schedule B (interest income via 1099-INT)
- **NODE-V2-02**: line_11_agi (AGI aggregation)
- **NODE-V2-03**: line_15_taxable_income (AGI minus deductions)
- **NODE-V2-04**: line_16_tax (tax from brackets)
- **NODE-V2-05**: Standard deduction constants (2025)
- **NODE-V2-06**: Tax bracket constants (2025)

### CLI Extensions

- **CLI-V2-01**: `tax form list --return_id {id} --node_type w2`
- **CLI-V2-02**: `tax form remove --return_id {id} --node_type w2 --node_id w2_01`
- **CLI-V2-03**: `tax form replace --return_id {id} --node_type w2 --node_id w2_01 '{...}'`
- **CLI-V2-04**: `tax validate {id}` — two-tier validation output

### Export

- **EXPORT-01**: PDF export via IRS AcroForm
- **EXPORT-02**: MeF XML export for e-filing

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI ingestion agent | Separate package (`agent/`), future milestone |
| State returns | Architecture ready, not implementing yet |
| E-filing transmission | Requires EFIN; use clearinghouse |
| Multi-user / auth | CLI tool; caller owns identity management |
| Prior tax years | 2025 only for now; multi-year architecture is ready |
| Schedule C, SE, D, E | Future phases after AGI/tax computation path complete |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| WS-01 | Phase 1 | Complete |
| WS-02 | Phase 1 | Complete |
| WS-03 | Phase 1 | Complete |
| CORE-01 | Phase 1 | Complete |
| CORE-02 | Phase 1 | Complete |
| CORE-03 | Phase 1 | Complete |
| CORE-04 | Phase 1 | Complete |
| EXEC-01 | Phase 1 | Pending |
| EXEC-02 | Phase 1 | Pending |
| EXEC-03 | Phase 1 | Pending |
| EXEC-04 | Phase 1 | Pending |
| NODE-01 | Phase 2 | Pending |
| NODE-02 | Phase 2 | Pending |
| NODE-03 | Phase 2 | Pending |
| NODE-04 | Phase 2 | Pending |
| NODE-05 | Phase 2 | Pending |
| CLI-01 | Phase 3 | Pending |
| CLI-02 | Phase 3 | Pending |
| CLI-03 | Phase 3 | Pending |
| CLI-04 | Phase 3 | Pending |
| CLI-05 | Phase 3 | Pending |
| STORE-01 | Phase 3 | Pending |
| STORE-02 | Phase 3 | Pending |
| STORE-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 after initial definition*
