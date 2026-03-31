# Engine Implementation TODOs

---

## Blocking (can't produce a correct 1040 without these)

- [ ] **Unrecaptured §1250 worksheet** — class exists and extends `UnimplementedTaxNode` but `compute()` is empty; Schedule D depends on this for capital gains rate computation

## Significant Gaps

- [ ] **Child Tax Credit / ACTC (f8812)** — input node exists, compute logic incomplete
- [ ] **Education credits (f8863)** — input node exists, compute logic incomplete
- [ ] **Form 1116 foreign tax credit limitation** — routing exists but limitation calculation incomplete
- [ ] **Form 8962 MEF builder** — form is computed but has no XML builder
- [ ] **E2E integration test** — no test runs a full return through planner → executor → MEF builder; all existing tests are unit-level

## Architectural Limitations

- [ ] **Circular dependency resolution** — AGI affects deduction phase-outs which affect AGI; Kahn's topological sort is one-pass and can't handle this
- [ ] **Prior-year carryforward persistence** — capital loss carryforwards, NOL, AMT credit carryover have nowhere to be stored or loaded from

## Organization & Structure

- [ ] **Reorganize `intermediate/` nodes into subcategories** — split flat folder into `worksheets/` (ira_deduction_worksheet, qdcgtw, rate_28_gain_worksheet, unrecaptured_1250_worksheet, income_tax_calculation, standard_deduction), `aggregation/` (agi_aggregator, schedule2, schedule3, schedule_b, schedule_d), and `forms/` (everything else)
- [ ] **Centralize year-specific constants into `2025/config/`** — many nodes and forms hardcode 2025 bracket thresholds, phase-out limits, standard deduction amounts, etc.; extract all into a single versioned config so future tax years require only one file change
- [ ] **Audit and complete under-researched nodes** — for every node that has an empty or shallow `research/context.md`, run the `build-tax-node` research skill, then update `compute()` if gaps are found; priority: `unrecaptured_1250_worksheet`, `form8960`, `form8582`, `form6251`, `form8995a`, `form8995`, `eitc`

## Polish

- [ ] **Form 8824 MEF builder** — form is computed but has no XML builder
- [ ] **Form 8960 NIIT passive income classification** — incomplete
- [ ] **Basis tracking for securities** — noted as skipped in f1099div tests
- [ ] **Multiple Form 8949 instance support** — per-transaction XML structure incomplete
- [ ] **Phase-out threshold centralization** — currently hardcoded per form; no central registry
