# Roadmap: 1040 Drake Parity — Node Coverage Expansion

## Overview

Build ~45 missing tax nodes in 9 phases of 5 nodes each, expanding coverage from 46.6% to ~85-90% of all computational Drake screens. Every phase uses the `build-tax-node` skill: Research → Black-Box Tests → Implementation for each node.

## Phases

- [ ] **Phase 1: Self-Employed & Retirement (Batch 1)** - SEP retirement, NOL carryforward, Form 3800, Form 2106, LTC premium
- [ ] **Phase 2: Deductions & Worksheets (Batch 2)** - Sales tax deduction, auto expense, depletion, Form 8582-CR, lump-sum SS
- [ ] **Phase 3: Special Situations A (Batch 3)** - Clergy, Form 8915-F, Form 8915-D, Form 5405, household wages
- [x] **Phase 4: Special Situations B (Batch 4)** - Foreign employer compensation, QSEHRA, Form 8917, Form 8867, Form 8859 (completed 2026-04-01)
- [ ] **Phase 5: Specialty Credits A (Batch 5)** - Form 8820, Form 8828, Form 8835, Form 8844, Form 8864
- [ ] **Phase 6: Specialty Credits B (Batch 6)** - Form 8896, Form 8912, Form 8978, Form 8611, PPP informational
- [ ] **Phase 7: Schema Extensions & Form 7203 (Batch 7)** - K-1 QBI fields, K-1 basis extensions, Form 7203, f4835 CIDP
- [ ] **Phase 8: International Simple (Batch 8)** - Form 8833, Form 8840, Form 8843, Form 8082, Form 8805
- [ ] **Phase 9: International Complex (Batch 9)** - Form 8854, Form 8873, Form 8288, Form 8621, Form 965-A/C/D/E

## Phase Details

### Phase 1: Self-Employed & Retirement (Batch 1)
**Goal**: Build 5 input nodes covering self-employed retirement, NOL carryforwards, general business credit, employee business expenses, and LTC premiums. For EACH node, run the complete build-tax-node skill sequence: (1) Research phase → produce research/context.md with IRS citations, (2) Black-box tests → write index.test.ts RED first, (3) Implementation → index.ts GREEN. Register each in registry.ts and inputs.ts. Update screens.json.
**Depends on**: Nothing
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06
**Success Criteria** (what must be TRUE):
  1. `forms/f1040/nodes/inputs/sep_retirement/index.ts` exists and routes to schedule1 line 16
  2. `forms/f1040/nodes/inputs/nol_carryforward/index.ts` exists and routes to schedule1 line 8a
  3. `forms/f1040/nodes/inputs/f3800/index.ts` exists and routes to schedule3 line 6
  4. `forms/f1040/nodes/inputs/f2106/index.ts` exists and routes to schedule1 line 12
  5. `forms/f1040/nodes/inputs/ltc_premium/index.ts` exists and routes to schedule_a
  6. All 5 nodes have research/context.md with IRS citations
  7. All 5 nodes have index.test.ts with passing tests
  8. All 5 nodes registered in registry.ts
  9. `deno task test` passes, `deno check forms/f1040/2025/registry.ts` exits 0
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Research all 5 nodes (produce research/context.md with IRS citations)
- [x] 01-02-PLAN.md — Extend schemas (schedule1, agi_aggregator, config) + write black-box tests (RED)
- [ ] 01-03-PLAN.md — Implement all 5 nodes (GREEN) + register in registry.ts, inputs.ts, screens.json

### Phase 2: Deductions & Worksheets (Batch 2)
**Goal**: Build 5 nodes covering state/local sales tax deduction, auto expense worksheet, oil/gas depletion, passive activity credit limitations (8582-CR as intermediate), and lump-sum social security. For EACH node, run the complete build-tax-node skill: Research → Black-box tests (RED) → Implementation (GREEN). Register each in registry.ts. Update screens.json.
**Depends on**: Phase 1
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06
**Success Criteria** (what must be TRUE):
  1. `forms/f1040/nodes/inputs/sales_tax_deduction/index.ts` exists, routes to schedule_a line 5
  2. `forms/f1040/nodes/inputs/auto_expense/index.ts` exists, routes to schedule_c/e/f
  3. `forms/f1040/nodes/inputs/depletion/index.ts` exists, routes to schedule_c/e
  4. `forms/f1040/nodes/intermediate/forms/form8582cr/index.ts` exists, routes to schedule3
  5. `forms/f1040/nodes/inputs/lump_sum_ss/index.ts` exists
  6. All 5 nodes have research/context.md with IRS citations
  7. All 5 nodes have passing tests
  8. `deno task test` passes, `deno check forms/f1040/2025/registry.ts` exits 0
**Plans**: 1 plan

Plans:
- [x] 02-01-PLAN.md — Fix depletion IRS compliance bug (greater-of rule), fix stale context.md reference, verify all 5 nodes

### Phase 3: Special Situations A (Batch 3)
**Goal**: Build 5 nodes for clergy income, disaster retirement distributions (8915-F and 8915-D), first-time homebuyer repayment (5405), and household employee wages. For EACH node: Research → Black-box tests (RED) → Implementation (GREEN) → Register → screens.json update.
**Depends on**: Phase 2
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06
**Success Criteria** (what must be TRUE):
  1. `forms/f1040/nodes/inputs/clergy/index.ts` exists, routes to schedule_se and schedule_c
  2. `forms/f1040/nodes/inputs/f8915f/index.ts` exists, routes to f1040 income + schedule3
  3. `forms/f1040/nodes/inputs/f8915d/index.ts` exists, routes to f1040 income + schedule3
  4. `forms/f1040/nodes/inputs/f5405/index.ts` exists, routes to schedule2
  5. `forms/f1040/nodes/inputs/household_wages/index.ts` exists, routes to f1040 line 1a
  6. All 5 nodes have research/context.md, passing tests, registered in registry.ts
  7. `deno task test` passes, `deno check forms/f1040/2025/registry.ts` exits 0
**Plans**: TBD

Plans:
- [ ] 03-01: Research all 5 nodes
- [ ] 03-02: Write black-box tests for all 5 nodes
- [ ] 03-03: Implement all 5 nodes + register + update screens.json

### Phase 4: Special Situations B (Batch 4)
**Goal**: Verify all 5 pre-built nodes (FEC, QSEHRA, F8917, F8867, F8859) meet success criteria. All nodes already implemented with passing tests -- this phase confirms correctness, registration, and research completeness.
**Depends on**: Phase 3
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06
**Success Criteria** (what must be TRUE):
  1. `forms/f1040/nodes/inputs/fec/index.ts` exists, routes to f1040 line 1a
  2. `forms/f1040/nodes/inputs/qsehra/index.ts` exists, routes to form8962
  3. `forms/f1040/nodes/inputs/f8917/index.ts` exists, routes to schedule1
  4. `forms/f1040/nodes/inputs/f8867/index.ts` exists (due diligence checklist)
  5. `forms/f1040/nodes/inputs/f8859/index.ts` exists, routes to schedule3
  6. All 5 nodes have research/context.md, passing tests, registered in registry.ts
  7. `deno task test` passes, `deno check forms/f1040/2025/registry.ts` exits 0
**Plans**: 1 plan

Plans:
- [x] 04-01-PLAN.md — Verify all 5 nodes: run node-scoped tests (80 pass), confirm registry/inputs registration, audit research/context.md completeness

### Phase 5: Specialty Credits A (Batch 5)
**Goal**: Build 5 specialty credit nodes: orphan drug credit (8820), federal mortgage subsidy recapture (8828), renewable electricity production credit (8835), empowerment zone employment credit (8844), biodiesel/renewable diesel/SAF credit (8864). Each: Research → Black-box tests (RED) → Implementation (GREEN) → Register → screens.json.
**Depends on**: Phase 4
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06
**Success Criteria** (what must be TRUE):
  1. `forms/f1040/nodes/inputs/f8820/index.ts` exists, routes to schedule3
  2. `forms/f1040/nodes/inputs/f8828/index.ts` exists, routes to schedule2
  3. `forms/f1040/nodes/inputs/f8835/index.ts` exists, routes to schedule3
  4. `forms/f1040/nodes/inputs/f8844/index.ts` exists, routes to schedule3
  5. `forms/f1040/nodes/inputs/f8864/index.ts` exists, routes to schedule3
  6. All 5 nodes have research/context.md, passing tests, registered in registry.ts
  7. `deno task test` passes, `deno check forms/f1040/2025/registry.ts` exits 0
**Plans**: TBD

Plans:
- [ ] 05-01: Research all 5 nodes
- [ ] 05-02: Write black-box tests for all 5 nodes
- [ ] 05-03: Implement all 5 nodes + register + update screens.json

### Phase 6: Specialty Credits B (Batch 6)
**Goal**: Build 5 nodes: low-sulfur diesel production credit (8896), credit to holders of tax credit bonds (8912), partner's additional reporting year tax (8978), LIHTC recapture (8611), and a PPP loan forgiveness informational node. Each: Research → Black-box tests (RED) → Implementation (GREEN) → Register → screens.json.
**Depends on**: Phase 5
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06
**Success Criteria** (what must be TRUE):
  1. `forms/f1040/nodes/inputs/f8896/index.ts` exists, routes to schedule3
  2. `forms/f1040/nodes/inputs/f8912/index.ts` exists, routes to schedule3
  3. `forms/f1040/nodes/inputs/f8978/index.ts` exists, routes to schedule2
  4. `forms/f1040/nodes/inputs/f8611/index.ts` exists, routes to schedule2
  5. `forms/f1040/nodes/inputs/ppp_forgiveness/index.ts` exists (informational)
  6. All 5 nodes have research/context.md, passing tests, registered in registry.ts
  7. `deno task test` passes, `deno check forms/f1040/2025/registry.ts` exits 0
**Plans**: TBD

Plans:
- [ ] 06-01: Research all 5 nodes
- [ ] 06-02: Write black-box tests for all 5 nodes
- [ ] 06-03: Implement all 5 nodes + register + update screens.json

### Phase 7: Schema Extensions & Form 7203 (Batch 7)
**Goal**: Extend existing K-1 node schemas with QBI fields (K199 screen), pre-2018 basis fields, and partner basis worksheet fields. Build new intermediate node for Form 7203 (S-Corp stock/debt basis). Extend f4835 with CIDP additional scenario. All extensions follow schema-first Zod pattern.
**Depends on**: Phase 6
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05
**Success Criteria** (what must be TRUE):
  1. `k1_partnership` schema extended with QBI fields (qbi_amount, w2_wages, ubia_property)
  2. `k1_s_corp` schema extended with QBI fields + Form 7203 basis fields
  3. `k1_trust` schema verified/extended for K1F screen data
  4. `forms/f1040/nodes/intermediate/forms/form7203/index.ts` exists
  5. `f4835` extended with CIDP additional scenario fields
  6. All extensions have passing tests
  7. `deno task test` passes, `deno check forms/f1040/2025/registry.ts` exits 0
**Plans**: TBD

Plans:
- [ ] 07-01: Research K-1 QBI fields and Form 7203
- [ ] 07-02: Write tests for all extensions
- [ ] 07-03: Implement all extensions and Form 7203

### Phase 8: International Simple (Batch 8)
**Goal**: Build 5 lower-complexity international nodes: treaty-based return position (8833), closer connection exception (8840), statement for exempt individuals (8843), notice of inconsistent treatment (8082), and foreign partner withholding (8805). Each: Research → Black-box tests (RED) → Implementation (GREEN) → Register → screens.json.
**Depends on**: Phase 7
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06
**Success Criteria** (what must be TRUE):
  1. `forms/f1040/nodes/inputs/f8833/index.ts` exists (treaty disclosure)
  2. `forms/f1040/nodes/inputs/f8840/index.ts` exists (closer connection)
  3. `forms/f1040/nodes/inputs/f8843/index.ts` exists (exempt individuals)
  4. `forms/f1040/nodes/inputs/f8082/index.ts` exists (inconsistent treatment)
  5. `forms/f1040/nodes/inputs/f8805/index.ts` exists, routes to f1040 withholding
  6. All 5 nodes have research/context.md, passing tests, registered in registry.ts
  7. `deno task test` passes, `deno check forms/f1040/2025/registry.ts` exits 0
**Plans**: TBD

Plans:
- [ ] 08-01: Research all 5 international nodes
- [ ] 08-02: Write black-box tests for all 5 nodes
- [ ] 08-03: Implement all 5 nodes + register + update screens.json

### Phase 9: International Complex (Batch 9)
**Goal**: Build 5 complex international nodes: expatriation statement (8854), extraterritorial income exclusion (8873), FIRPTA withholding (8288), PFIC shareholder return (8621), and §965 repatriation tax (965-A/C variants). Each: Research → Black-box tests (RED) → Implementation (GREEN) → Register → screens.json.
**Depends on**: Phase 8
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06
**Success Criteria** (what must be TRUE):
  1. `forms/f1040/nodes/inputs/f8854/index.ts` exists (expatriation)
  2. `forms/f1040/nodes/inputs/f8873/index.ts` exists (extraterritorial income)
  3. `forms/f1040/nodes/inputs/f8288/index.ts` exists (FIRPTA)
  4. `forms/f1040/nodes/inputs/f8621/index.ts` exists (PFIC)
  5. `forms/f1040/nodes/inputs/f965/index.ts` exists (§965 repatriation)
  6. All 5 nodes have research/context.md, passing tests, registered in registry.ts
  7. `deno task test` passes, `deno check forms/f1040/2025/registry.ts` exits 0
  8. Overall coverage ≥85% of computational Drake screens
**Plans**: TBD

Plans:
- [ ] 09-01: Research all 5 complex international nodes
- [ ] 09-02: Write black-box tests for all 5 nodes
- [ ] 09-03: Implement all 5 nodes + register + update screens.json

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Self-Employed & Retirement | 2/3 | In Progress|  |
| 2. Deductions & Worksheets | 0/1 | Not started | - |
| 3. Special Situations A | 0/3 | Not started | - |
| 4. Special Situations B | 1/1 | Complete   | 2026-04-01 |
| 5. Specialty Credits A | 0/3 | Not started | - |
| 6. Specialty Credits B | 0/3 | Not started | - |
| 7. Schema Extensions & Form 7203 | 0/3 | Not started | - |
| 8. International Simple | 0/3 | Not started | - |
| 9. International Complex | 0/3 | Not started | - |

### Phase 10: XSD Validation in CI — xmllint against IRS XSD files, wire into Deno test suite

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 9
**Plans:** 1/1 plans complete

Plans:
- [ ] TBD (run /gsd:plan-phase 10 to break down)
