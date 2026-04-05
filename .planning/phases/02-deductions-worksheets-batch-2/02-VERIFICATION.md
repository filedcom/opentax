---
phase: 02-deductions-worksheets-batch-2
verified: 2026-04-06T00:00:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 2: Deductions & Worksheets (Batch 2) Verification Report

**Phase Goal:** Build 5 nodes covering state/local sales tax deduction, auto expense worksheet, oil/gas depletion, passive activity credit limitations (8582-CR as intermediate), and lump-sum social security. For EACH node: Research → Black-box tests (RED) → Implementation (GREEN). Register each in registry.ts. Update screens.json.
**Verified:** 2026-04-06
**Status:** passed
**Re-verification:** No — retroactive verification (phase completed 2026-04-01, VERIFICATION.md not written at time)

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                   | Status   | Evidence                                                                                              |
|----|--------------------------------------------------------------------------------------------------------|----------|-------------------------------------------------------------------------------------------------------|
| 1  | Depletion node computes both cost and percentage depletion and returns the greater of the two (IRC §611) | VERIFIED | `depletion/index.ts`: `return Math.max(cost, pct)` — method field no longer controls output           |
| 2  | COST method items where percentage depletion would be higher get the percentage amount                  | VERIFIED | `depletion/index.test.ts` "COAL COST item where percentage wins": cost=5, pct=5000 → 5000             |
| 3  | PERCENTAGE method items where cost depletion would be higher get the cost amount                        | VERIFIED | `depletion/index.test.ts` "METALS PERCENTAGE item where cost wins": cost=80000, pct=500 → 80000       |
| 4  | sales_tax_deduction context.md references correct field name line_5a_tax_amount                        | VERIFIED | `sales_tax_deduction/research/context.md` contains "line_5a_tax_amount" (3 occurrences)               |
| 5  | All 5 Phase 2 nodes pass their tests                                                                    | VERIFIED | `deno test` across all 5 nodes: 111 passed, 0 failed (auto_expense=23, depletion=34, lump_sum_ss=15, sales_tax_deduction=20, form8582cr=19) |
| 6  | All 5 Phase 2 nodes are registered in registry.ts and inputs.ts (where applicable)                     | VERIFIED | All 5 in registry.ts; 4 input nodes in inputs.ts (form8582cr correctly absent — intermediate node)    |
| 7  | deno check forms/f1040/2025/registry.ts exits 0                                                        | VERIFIED | `deno check forms/f1040/2025/registry.ts` — exit 0, no output                                        |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact                                                                    | Expected                               | Status   | Details                                    |
|-----------------------------------------------------------------------------|----------------------------------------|----------|--------------------------------------------|
| `forms/f1040/nodes/inputs/sales_tax_deduction/index.ts`                    | Sales tax deduction node               | VERIFIED | Exists, substantive implementation         |
| `forms/f1040/nodes/inputs/sales_tax_deduction/index.test.ts`               | Sales tax tests (20)                   | VERIFIED | 20 tests, all pass                         |
| `forms/f1040/nodes/inputs/auto_expense/index.ts`                            | Auto expense worksheet node            | VERIFIED | Exists, substantive implementation         |
| `forms/f1040/nodes/inputs/auto_expense/index.test.ts`                       | Auto expense tests (23)                | VERIFIED | 23 tests, all pass                         |
| `forms/f1040/nodes/inputs/depletion/index.ts`                               | Oil/gas depletion node (IRC §611)      | VERIFIED | Exists; `Math.max(cost, pct)` at line 66   |
| `forms/f1040/nodes/inputs/depletion/index.test.ts`                          | Depletion tests (34)                   | VERIFIED | 34 tests, all pass                         |
| `forms/f1040/nodes/intermediate/forms/form8582cr/index.ts`                  | Passive activity credit limitations    | VERIFIED | Exists, substantive implementation         |
| `forms/f1040/nodes/intermediate/forms/form8582cr/index.test.ts`             | Form 8582-CR tests (19)                | VERIFIED | 19 tests, all pass                         |
| `forms/f1040/nodes/inputs/lump_sum_ss/index.ts`                             | Lump-sum social security node          | VERIFIED | Exists, substantive implementation         |
| `forms/f1040/nodes/inputs/lump_sum_ss/index.test.ts`                        | Lump-sum SS tests (15)                 | VERIFIED | 15 tests, all pass                         |
| `forms/f1040/nodes/inputs/sales_tax_deduction/research/context.md`          | IRS citations for sales tax            | VERIFIED | Exists with correct field name reference   |

---

### Key Link Verification

| From                              | To                               | Via                | Status   | Details                                                              |
|-----------------------------------|----------------------------------|--------------------|----------|----------------------------------------------------------------------|
| `depletion/index.ts`              | IRC §611 greater-of rule         | Math.max           | VERIFIED | `return Math.max(cost, pct)` — both methods always computed          |
| All 5 nodes                       | `forms/f1040/2025/registry.ts`   | Node registration  | VERIFIED | sales_tax_deduction, auto_expense, depletion, lump_sum_ss, form8582cr present |
| 4 input nodes                     | `forms/f1040/2025/inputs.ts`     | Input registration | VERIFIED | sales_tax_deduction, auto_expense, depletion, lump_sum_ss (form8582cr is intermediate, correctly absent) |

---

### Behavioral Spot-Checks

| Behavior                       | Command                                                                                                                                    | Result               | Status |
|--------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|----------------------|--------|
| 111 Phase 2 tests pass         | `deno test forms/f1040/nodes/inputs/sales_tax_deduction/ forms/f1040/nodes/inputs/auto_expense/ forms/f1040/nodes/inputs/depletion/ forms/f1040/nodes/inputs/lump_sum_ss/ forms/f1040/nodes/intermediate/forms/form8582cr/` | 111 passed, 0 failed | PASS   |
| Registry type-checks clean     | `deno check forms/f1040/2025/registry.ts`                                                                                                  | Exit 0, no output    | PASS   |

---

### Requirements Coverage

| Requirement    | Description                                                                   | Status    | Evidence                                                                            |
|----------------|-------------------------------------------------------------------------------|-----------|-------------------------------------------------------------------------------------|
| REQ-02-VERIFY  | Phase 02 VERIFICATION.md exists with test gate evidence                        | SATISFIED | This document — 111 tests pass, deno check clean                                    |

---

### Gaps Summary

No gaps. All 7 must-have truths verified, all artifacts exist, all key links confirmed, behavioral spot-checks pass. The depletion IRC §611 compliance fix (the only code change in this phase) was verified: `Math.max(cost, pct)` replaces method-branching.

---

_Verified: 2026-04-06_
_Verifier: Claude (retroactive — phase completed 2026-04-01)_
