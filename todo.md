# Engine Implementation TODOs

---

## Recently Completed (this session)

- [x] **f8812 Child Tax Credit / ACTC** — compute logic implemented and tested
- [x] **f8863 Education credits** — compute logic implemented and tested
- [x] **Unrecaptured §1250 worksheet** — implemented and tested
- [x] **form8960 NIIT** — researched and implemented
- [x] **form8582 passive activity losses** — researched and implemented
- [x] **form6251 AMT** — researched and implemented
- [x] **form8995 QBI deduction** — researched and implemented
- [x] **eitc** — researched and implemented
- [x] **Reorganize `intermediate/` nodes into subcategories** — split into `worksheets/`, `aggregation/`, `forms/`; research context.md added to all nodes
- [x] **f1040 output node** — full Form 1040 assembly sink node implemented and fixed to emit assembled result into pending (lines 1a–37, taxable income, total tax, refund/owed)
- [x] **schedule1 output node** — full Schedule 1 assembly sink node implemented and fixed to emit assembled result into pending (Part I additional income, Part II adjustments)
- [x] **E2E integration test** — forms/f1040/e2e/return.test.ts: two full returns through executor (W-2 single filer → $2,886 refund; self-employed Schedule C → amount owed), exact line values verified
- [x] **AGI aggregator research/context.md** — IRC §62 authority, all income/exclusion/deduction components documented
- [x] **Standard deduction research/context.md** — IRC §63(c), TY2025 amounts, age/blindness logic, MFS constraint

---

## Blocking

## Architectural Limitations

- [ ] **Circular dependency resolution** — AGI affects deduction phase-outs which affect AGI; Kahn's topological sort is one-pass and can't handle this
- [ ] **Prior-year carryforward persistence** — capital loss carryforwards, NOL, AMT credit carryover have nowhere to be stored or loaded from

## Organization & Structure

- [ ] **Centralize year-specific constants into `2025/config/`** — many nodes and forms hardcode 2025 bracket thresholds, phase-out limits, standard deduction amounts, etc.; extract all into a single versioned config so future tax years require only one file change

## Polish

- [ ] **Form 8962 MEF builder** — form is computed but has no XML builder
- [ ] **Form 8824 MEF builder** — form is computed but has no XML builder
- [ ] **Form 8960 NIIT passive income classification** — incomplete
- [ ] **Basis tracking for securities** — noted as skipped in f1099div tests
- [ ] **Multiple Form 8949 instance support** — per-transaction XML structure incomplete
- [ ] **Phase-out threshold centralization** — currently hardcoded per form; no central registry
- [ ] **Form 1116 foreign tax credit limitation** — routing exists but limitation calculation incomplete
