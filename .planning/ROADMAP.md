# Roadmap: 1040 Drake Parity — Node Coverage Expansion

## Overview

Build ~45 missing tax nodes in 9 phases of 5 nodes each, expanding coverage from 46.6% to ~85-90% of all computational Drake screens. Every phase uses the `build-tax-node` skill: Research → Black-Box Tests → Implementation for each node.

## Phases

- [ ] **Phase 1: Self-Employed & Retirement (Batch 1)** - SEP retirement, NOL carryforward, Form 3800, Form 2106, LTC premium
- [ ] **Phase 2: Deductions & Worksheets (Batch 2)** - Sales tax deduction, auto expense, depletion, Form 8582-CR, lump-sum SS
- [ ] **Phase 3: Special Situations A (Batch 3)** - Clergy, Form 8915-F, Form 8915-D, Form 5405, household wages
- [x] **Phase 4: Special Situations B (Batch 4)** - Foreign employer compensation, QSEHRA, Form 8917, Form 8867, Form 8859 (completed 2026-04-01)
- [x] **Phase 5: Specialty Credits A (Batch 5)** - Form 8820, Form 8828, Form 8835, Form 8844, Form 8864 (completed 2026-04-01)
- [ ] **Phase 6: Specialty Credits B (Batch 6)** - Form 8896, Form 8912, Form 8978, Form 8611, PPP informational
- [x] **Phase 7: Schema Extensions & Form 7203 (Batch 7)** - K-1 QBI fields, K-1 basis extensions, Form 7203, f4835 CIDP (completed 2026-04-05)
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
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Verify research/context.md completeness for all 5 nodes
- [x] 03-02-PLAN.md — Verify test suites pass and cover expected scenarios (128 tests)
- [x] 03-03-PLAN.md — Verify registry, inputs, screens.json registration and output routing

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
**Goal**: Verify all 5 pre-built specialty credit nodes (F8820, F8828, F8835, F8844, F8864) meet success criteria. All nodes already implemented with passing tests -- this phase confirms correctness, registration, routing, and research completeness.
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
**Plans**: 1 plan

Plans:
- [x] 05-01-PLAN.md — Verify all 5 nodes: run node-scoped tests (108 pass), confirm registry registration, audit research/context.md and output routing

### Phase 6: Specialty Credits B (Batch 6)
**Goal**: Verify all 5 pre-built nodes (F8896, F8912, F8978, F8611, PPP forgiveness) meet success criteria. All nodes already implemented with passing tests -- this phase confirms correctness, registration, routing, and research completeness.
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
**Plans**: 1 plan

Plans:
- [x] 06-01-PLAN.md — Verify all 5 nodes: run node-scoped tests (115 pass), confirm registry registration, audit research/context.md and output routing

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
**Plans**: 1 plan

Plans:
- [x] 07-01-PLAN.md — Verify all schema extensions, Form 7203, and f4835 CIDP: run node-scoped tests (202 pass), confirm registrations, audit research and routing

### Phase 8: International Simple (Batch 8)
**Goal**: Verify all 5 pre-built international simple nodes (f8833, f8840, f8843, f8082, f8805) meet success criteria. All nodes already implemented with passing tests -- this phase confirms correctness, registration, routing, and research completeness.
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
**Plans**: 1 plan

Plans:
- [ ] 08-01-PLAN.md — Verify all 5 nodes: run node-scoped tests (106 pass), confirm registry registration, audit research/context.md and output routing

### Phase 9: International Complex (Batch 9)
**Goal**: Verify all 5 pre-built international complex nodes (f8854, f8873, f8288, f8621, f965) meet success criteria. All nodes already implemented with passing tests -- this phase confirms correctness, registration, routing, and research completeness.
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
**Plans**: 1 plan

Plans:
- [x] 09-01-PLAN.md — Verify all 5 nodes: run node-scoped tests (139 pass), confirm registry registration, audit research/context.md and output routing

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Self-Employed & Retirement | 2/3 | In Progress|  |
| 2. Deductions & Worksheets | 0/1 | Not started | - |
| 3. Special Situations A | 1/3 | In Progress|  |
| 4. Special Situations B | 1/1 | Complete   | 2026-04-01 |
| 5. Specialty Credits A | 1/1 | Complete   | 2026-04-01 |
| 6. Specialty Credits B | 0/1 | Not started | - |
| 7. Schema Extensions & Form 7203 | 1/1 | Complete   | 2026-04-05 |
| 8. International Simple | 0/1 | Planned    |  |
| 9. International Complex | 0/1 | Planned    |  |
| 10. XSD Validation in CI | 1/1 | Complete    | 2026-04-05 |
| 11. Executor Error Isolation | 1/1 | Complete    | 2026-04-05 |
| 12. Validation Rule Stubs | 0/3 | Planned | - |

### Phase 10: XSD Validation in CI
**Goal**: Add programmatic MeF XML validation against IRS XSD files to the Deno test suite. The IRS 2025v3.0 XSDs live in `.research/docs/IMF_Series_2025v3.0/`. Currently generated XML is never validated against them. Wire `xmllint --schema` (or equivalent Deno subprocess) into a dedicated test file that generates MeF XML for at least 3 e2e scenarios and asserts XSD compliance. Fix any schema violations discovered. Add a `deno task validate:mef` task alias.
**Depends on**: Phase 9 (independent — can run anytime)
**Requirements**: REQ-XSD-01
**Success Criteria** (what must be TRUE):
  1. `forms/f1040/2025/mef/xsd-validation.test.ts` exists and runs via `deno task test`
  2. At least 3 e2e scenarios generate MeF XML and validate it against the IRS Form 1040 XSD
  3. All XSD validation assertions pass (0 xmllint errors)
  4. Any schema violations found during development are fixed before the test is committed
  5. `deno task test` passes overall (56K+ tests)
  6. `returnVersion` string matches the actual IRS published schema version in the XSD files
**Plans**: 1 plan

Plans:
- [x] 10-01-PLAN.md — Create XSD validation test harness (3 e2e scenarios + xmllint) and add validate:mef task

### Phase 11: Executor Error Isolation
**Goal**: Fix the silent node skip bug in `core/runtime/executor.ts`. Currently if a node's pending input fails Zod parse (line 67-70), the node is silently skipped with `continue` — no error, no diagnostic, no indication to the caller. Wrap each node's execution in a per-node try/catch. On Zod parse failure OR compute() throw: add a `DiagnosticsReport` entry (severity: error, code: "EXECUTOR_NODE_FAILURE") and continue executing remaining nodes rather than aborting. Add tests that exercise both failure paths.
**Depends on**: Phase 10 (independent — can run anytime)
**Requirements**: REQ-EXEC-01
**Success Criteria** (what must be TRUE):
  1. `executor.ts` wraps each node execution in try/catch — no unhandled exceptions escape
  2. Zod parse failure on a node produces a diagnostic entry, not a silent skip
  3. `node.compute()` throw produces a diagnostic entry, does not abort the full execution
  4. Remaining nodes in the DAG still execute after a single node failure
  5. `core/runtime/executor.test.ts` has tests covering: parse failure produces diagnostic, compute throw produces diagnostic, other nodes still run after failure
  6. `deno task test` passes overall
**Plans**: 1 plan

Plans:
- [x] 11-01-PLAN.md — Per-node try/catch with diagnostic entries + tests for parse failure and compute throw paths

### Phase 12: Validation Rule Stubs — High-Value Batch
**Goal**: Implement the highest-value subset of the 753 `alwaysPass` validation rule stubs. Focus on rules that are (a) implementable client-side (no IRS database lookup required), (b) catch real taxpayer errors, and (c) cover forms with broad usage. Target: TIN/EIN format validation (~30 rules from the 63 total TIN rules), simple conditional math rules (~20 rules from the 57 total), and binary presence rules that can be evaluated from the pending dict (~10 rules). Skip: database lookup rules (prior-year AGI, IP-PIN), per-item repeating group rules requiring `everyItem` DSL combinator.
**Depends on**: Phase 11 (independent — can run anytime)
**Requirements**: REQ-VAL-01
**Success Criteria** (what must be TRUE):
  1. At least 40 previously-`alwaysPass` rules now have real predicate implementations
  2. All newly implemented rules have passing tests in their rule file's test suite
  3. No previously-passing rules are broken
  4. `deno task test` passes overall
  5. `ALWAYSPASS_ROADMAP.md` updated to reflect newly implemented rules
  6. At least 5 TIN/EIN format rules implemented (SSN format, EIN format, ITIN format)
  7. At least 5 conditional math rules implemented (line totals, credit limits)
**Plans**: 3 plans

Plans:
- [ ] 12-01-PLAN.md — Create predicate test infra + add 4 new predicates (validEIN, betweenNum, diffLteNum, notGtPctOfField)
- [ ] 12-02-PLAN.md — Convert 40+ alwaysPass stubs to real predicate implementations across rule files
- [ ] 12-03-PLAN.md — Update ALWAYSPASS_ROADMAP.md + final deno task test gate
