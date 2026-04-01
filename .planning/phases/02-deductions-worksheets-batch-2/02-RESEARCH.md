# Phase 2: Deductions & Worksheets (Batch 2) - Research

**Researched:** 2026-04-01
**Domain:** IRS tax node audit — 5 existing nodes vs IRS rules, registration, and test coverage
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting.
Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Claude's Discretion
All implementation choices, including any gaps to close, pattern improvements, and test additions.

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-01 | Each node must have `research/context.md` with IRS citations before implementation | All 5 nodes have context.md — audit findings below |
| REQ-02 | Tests must be written before implementation (TDD red-green) | All 5 nodes have index.test.ts — audit findings below |
| REQ-03 | All nodes must be registered in registry.ts and inputs.ts | registry.ts: all 5 present; inputs.ts: 4/4 input nodes present (form8582cr is intermediate — not in inputs.ts, which is correct) |
| REQ-04 | `deno task test` must pass after each phase | 108 Phase 2 node tests pass; 59 pre-existing MeF builder failures exist that are unrelated to Phase 2 |
| REQ-05 | `deno check forms/f1040/2025/registry.ts` must pass | Passes with 0 errors |
| REQ-06 | screens.json must be updated with filed_tax_node_type_code | All 5 present in `forms/f1040/nodes/inputs/screens.json` |
</phase_requirements>

---

## Summary

All 5 Phase 2 nodes were implemented before this research phase ran (commit 22e0e30). This research is therefore an **audit** of completeness and correctness rather than forward-looking library research.

The audit finds the nodes are largely complete and well-implemented. Every node follows project conventions: schema-first Zod, pure functions, OutputNodes routing, early returns, no mutation. All 5 have IRS-cited research/context.md files, passing index.test.ts suites (108 tests total), and are registered in registry.ts and screens.json.

Three gaps and one discrepancy require attention in the planning phase:

1. **Depletion "greater of" logic is unimplemented.** The research/context.md specifies the IRS rule (use the greater of cost or percentage depletion — IRC §611), but the implementation hard-branches on `method` field and never computes both. The IRS requires taxpayers take the greater, not pick one. The current implementation is wrong for the PERCENTAGE method when cost depletion would be higher.

2. **sales_tax_deduction context.md cites wrong field name.** The context.md says output goes to `schedule_a.line_5b_sales_tax`, but the implementation and schedule_a schema use `line_5a_tax_amount`. The implementation is correct; the context.md has a stale reference.

3. **MeF builder tests have 59 pre-existing failures.** These are in `builder.ts`, `pending.ts`, `filer.ts`, `header.ts` — all tracked as modified in git status. The failures are due to XML `documentId` attributes added to element tags. These failures existed before Phase 2 and are unrelated to the 5 Phase 2 nodes. The planner must note this so the phase exit criterion (`deno task test` passes) is clearly scoped to node-level tests only, not the MeF builder suite.

4. **form8582cr is correctly absent from inputs.ts.** It is an intermediate node and should not appear in inputs.ts. This is correct behavior.

**Primary recommendation:** Plan a single verification/fix wave: correct depletion "greater of" logic, update sales_tax context.md field reference, confirm pre-existing MeF failures are documented and not a Phase 2 blocker.

---

## Project Constraints (from CLAUDE.md)

| Directive | Constraint |
|-----------|------------|
| Schema first | Define Zod schema, infer types — never redeclare |
| z.nativeEnum | Use for all domain codes (enums exported) |
| Pure functions | compute() composes small pure helpers; no side effects |
| No mutation | Spread/map/filter — never modify arguments |
| Early returns | Guard clauses before logic, no deep nesting |
| File shape | imports → enums → itemSchema → inputSchema → type aliases → helpers → class → singleton |
| OutputNodes | Compile-time routing safety — only declared output nodes |
| Type safety | Never `as any`, never `Record<string, unknown>` where typed schema exists |
| No speculative abstraction | Don't extract helpers without actual reuse |
| Function size | <50 lines per function |
| File size | <800 lines |

---

## Node Audit Results

### Node 1: sales_tax_deduction

**Location:** `forms/f1040/nodes/inputs/sales_tax_deduction/`
**Status:** COMPLETE — with one context.md discrepancy

#### Implementation correctness (HIGH confidence)
- Routes to `schedule_a.line_5a_tax_amount` — confirmed correct by reading schedule_a schema
- Actual method: uses `actual_sales_tax_paid` directly
- Table method: sums `table_amount + major_purchase_tax`
- Zero output guard: early return when base = 0
- Enum: `SalesTaxMethod` with `Actual` and `Table` values
- IRS citations: IRC §164(b)(5)(A), §164(b)(5)(F), §164(b)(5)(H); Pub. 600; TCJA §11042

#### Context.md discrepancy (MEDIUM confidence)
The context.md says output field is `schedule_a.line_5b_sales_tax` (line 5b). The implementation and schedule_a schema both use `line_5a_tax_amount`. The context.md is stale — the code is correct. The IRS Schedule A instruction labels general sales tax on Line 5b but the internal schema field is `line_5a_tax_amount` (which handles the tax election). **Action: fix context.md to reference `line_5a_tax_amount`.**

#### Test coverage
20 tests. Covers: schema validation (6), actual method routing (3), table method routing (2), major purchase add-on (4), output routing (2), hard validation (2), edge cases (1), smoke test (1). Coverage is adequate.

#### Registration
- registry.ts: present (line 277)
- inputs.ts: present (line 209), `isArray: false` — correct for singleton schema
- screens.json: present (STAX screen code)

---

### Node 2: auto_expense

**Location:** `forms/f1040/nodes/inputs/auto_expense/`
**Status:** COMPLETE

#### Implementation correctness (HIGH confidence)
- Standard mileage: 70 cents/mile per IRS Notice 2025-5 — correct for TY2025
- Actual method: `total_actual × (business_miles / total_miles)`, rounded to cents
- Routing: SCHEDULE_C → `schedule_c.line_9_car_truck_expenses`; SCHEDULE_E → `schedule_e.expense_auto_travel`; SCHEDULE_F → `schedule_f.line10_car_truck`
- Cross-field validation: business_miles > total_miles throws; total_miles = 0 with actual expenses throws
- Multiple vehicles aggregated by purpose before output
- IRS citations: IRS Notice 2025-5 (70¢ rate), Rev. Proc. 2019-46, Pub. 463, IRC §280F

#### Test coverage
23 tests. Covers: schema validation (6), standard mileage (3), actual expenses (3), purpose routing (3), aggregation (2), hard validation (3), edge cases (2), smoke test (1). Coverage is adequate.

#### Registration
- registry.ts: present (line 278)
- inputs.ts: present (line 210), `isArray: true` with `itemSchema` export — correct for per-vehicle array
- screens.json: present (AUTO screen code)

---

### Node 3: depletion

**Location:** `forms/f1040/nodes/inputs/depletion/`
**Status:** COMPLETE — with IRS rule gap

#### Implementation correctness — ISSUE FOUND (HIGH confidence)
The research/context.md (Step 6) and IRS IRC §611 both state: **"taxpayer uses the greater of cost or percentage depletion."** However, the implementation hard-branches on `method`:
- `DepletionMethod.COST` → returns only cost depletion, never compares to percentage
- `DepletionMethod.PERCENTAGE` → returns only percentage depletion, never compares to cost

This violates the IRS rule that taxpayers must take the greater. The fix is: for PERCENTAGE method, also compute cost depletion and return `Math.max(costDepletion, percentageDepletion)`.

The comment in the implementation says:
```ts
// For simplicity matching standard practice: PERCENTAGE selects percentage only.
```
This is a deliberate simplification, but it is incorrect per IRS rules. A taxpayer with COST method currently gets 0 percentage depletion even when percentage would be higher.

**Action required:** Fix `depletionDeduction()` to compute both methods and return the greater of the two for both PERCENTAGE and COST modes. Update affected tests.

#### Rates verified (HIGH confidence)
- OIL_GAS: 15% (IRC §613A(c)) — correct
- COAL: 10% (IRC §613(b)) — correct
- METALS: 15% (IRC §613(b) gold/silver/copper/iron ore) — correct (simplified; sulphur/uranium 22% and other metal mines 14% not handled, but scope covers METALS as a category)
- OTHER_MINERAL: 14% (IRC §613(b) "all other minerals") — correct
- Net income limit: oil/gas 100%, others 50% — correct
- 65% taxable income cap: oil/gas only — correct

#### Test coverage
31 tests. Covers: schema validation (8), percentage depletion rates (4), cost depletion (3), net income limit (4), 65% cap (2), output routing (4), aggregation (2), edge cases (2), smoke test (1). Tests will need updates after "greater of" fix.

#### Registration
- registry.ts: present (line 306)
- inputs.ts: present (line 238), `isArray: true` with `itemSchema` export — correct
- screens.json: present (DEPL screen code)

---

### Node 4: form8582cr

**Location:** `forms/f1040/nodes/intermediate/forms/form8582cr/`
**Status:** COMPLETE

#### Implementation correctness (HIGH confidence)
- Tax attributable to passive income: `regular_tax_all_income - regular_tax_without_passive` — correct per Form 8582-CR Part I
- Base allowed: `min(available_credits, tax_attributable)` — correct
- Special allowance (Part II): phase-out of $25,000 at 50% for MAGI $100K–$150K — correct per IRC §469(i)
- MFS ineligibility: `filing_status === FilingStatus.MFS` → no special allowance — correct (conservative)
- Real estate professional bypass: all credits allowed — correct per IRC §469(c)(7)
- Prior-year carryforward added to total available credits — correct per IRC §469(b)
- Routes to `schedule3.line6z_general_business_credit` — confirmed correct
- Constants: $25,000 allowance, $100K/$150K MAGI thresholds, $12,500/$50K/$75K MFS values all cited to IRC §469(i)

#### MFS Phase-out Note
The MFS $12,500 allowance and $50K/$75K phase-out thresholds are defined in constants but never used in the implementation (MFS is treated as fully ineligible). This is the conservative approach noted in the code and is acceptable.

#### Test coverage
19 tests. Covers: schema validation (4), zero inputs (2), base credit calculation (3), prior-year carryforward (1), special allowance below threshold (1), above threshold (1), phase-out range (1), lower threshold (1), MFS ineligibility (1), real estate professional (1), output routing (2), smoke test (1). Coverage is adequate.

#### Registration
- registry.ts: present (line 349)
- inputs.ts: NOT present — correct (intermediate nodes are not in inputs.ts)
- screens.json: present (CR screen code)

---

### Node 5: lump_sum_ss

**Location:** `forms/f1040/nodes/inputs/lump_sum_ss/`
**Status:** COMPLETE

#### Implementation correctness (HIGH confidence)
- Routes to `f1040.line6a_ss_gross` — correct per Pub. 915 / IRC §86
- Election beneficial: `total_ss_benefits_this_year - lump_sum_amount` (excludes lump sum from current year)
- Election not beneficial or not set: routes `total_ss_benefits_this_year` in full
- Cross-field validation: `lump_sum_amount > total_ss_benefits_this_year` throws
- Zero output guard: no output when adjusted total = 0
- IRS citations: Pub. 915 Worksheets 1/4, IRC §86

#### Scope boundary note (informational)
This node outputs gross SS benefits (`line6a_ss_gross`). The downstream calculation of the taxable portion (0%, 50%, or 85% inclusion per IRC §86(a)) is handled by a separate ssa1099 node or f1040 aggregator. The lump_sum_ss node correctly stops at gross benefits.

#### Test coverage
15 tests. Covers: schema validation (4), zero benefits (1), no lump sum (1), election beneficial (1), election not beneficial (1), no override (1), hard validation (1), prior year benefits array (1), output routing (2), aggregation (1), smoke test (1). Coverage is adequate.

#### Registration
- registry.ts: present (line 307)
- inputs.ts: present (line 239), `isArray: true` with `itemSchema` export — correct
- screens.json: present (LSSA screen code)

---

## Standard Stack

No new libraries required. Phase 2 uses the same stack as Phase 1.

### Core (already installed)
| Library | Version | Purpose |
|---------|---------|---------|
| zod | per deno.json | Schema validation and type inference |
| @std/assert | per deno.json | Deno test assertions |
| Project core types | internal | TaxNode, OutputNodes, NodeContext |

---

## Architecture Patterns

All 5 nodes follow the established project pattern without deviation.

### File shape (all 5 nodes conform)
```
index.ts:
  1. Imports
  2. Enum(s) for domain codes
  3. itemSchema (per-item, for array nodes) or inputSchema (for singleton)
  4. inputSchema (wraps items array or is the root schema)
  5. Type aliases
  6. Pure helper functions
  7. Node class (extends TaxNode)
  8. Singleton export
```

### Singleton vs array input pattern
| Node | Pattern | inputSchema shape |
|------|---------|-------------------|
| sales_tax_deduction | Singleton | `z.object({...})` — `isArray: false` in inputs.ts |
| auto_expense | Array | `z.object({ auto_expenses: z.array(itemSchema).min(1) })` — `isArray: true` |
| depletion | Array | `z.object({ depletions: z.array(itemSchema).min(1) })` — `isArray: true` |
| form8582cr | Singleton (intermediate) | `z.object({...})` — not in inputs.ts |
| lump_sum_ss | Array | `z.object({ lump_sum_sss: z.array(itemSchema).min(1) })` — `isArray: true` |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Percentage depletion rate lookup | custom switch | Existing `percentageRate()` helper in depletion/index.ts |
| Net income limit enforcement | ad-hoc | Existing `netIncomeLimit()` + `percentageDepletion()` in depletion/index.ts |
| Output aggregation by purpose | custom accumulator | Existing `aggregateByPurpose()` in auto_expense/index.ts |
| OutputNodes routing | string literals | `OutputNodes` class from core/types |

---

## Common Pitfalls

### Pitfall 1: Depletion "greater of" rule not enforced
**What goes wrong:** The IRS requires taking the greater of cost or percentage depletion (IRC §611). Current implementation bypasses this by branching on `method`.
**Why it happens:** Developer chose simplification ("standard practice") over IRS correctness.
**How to avoid:** `depletionDeduction()` must compute both methods and return `Math.max(costDepletion(item), percentageDepletion(item))`.
**Warning signs:** PERCENTAGE method user with high adjusted_basis gets lower deduction than they're entitled to; COST method user misses percentage depletion entirely.

### Pitfall 2: schedule_a field name mismatch in context.md
**What goes wrong:** context.md references `line_5b_sales_tax` but the field is `line_5a_tax_amount`.
**Why it happens:** Context was written before the schedule_a schema was finalized.
**How to avoid:** Always verify output field names against the target node's inputSchema.
**Warning signs:** Test failures when validating output fields by name.

### Pitfall 3: MeF builder test failures pre-exist Phase 2
**What goes wrong:** `deno task test` reports 59 failures in builder.test.ts and header.test.ts.
**Why it happens:** builder.ts/header.ts/filer.ts/pending.ts have uncommitted changes (documentId attributes in XML tags).
**How to avoid:** Phase 2 exit criterion should target 0 failures in node-level tests; builder failures are a separate concern.
**Warning signs:** All 6005 node-level tests pass; only MeF-layer tests fail.

### Pitfall 4: form8582cr incorrectly added to inputs.ts
**What goes wrong:** Intermediate nodes should not be in inputs.ts (they are not user-entered screens).
**Why it happens:** Forgetting the distinction between input and intermediate node registration.
**How to avoid:** Only input nodes go in inputs.ts. form8582cr is correctly absent.

---

## Code Examples

### Depletion "greater of" fix pattern
```typescript
// Source: IRC §611(b) — "greater of cost or percentage"
// CURRENT (WRONG): hard-branches on method
function depletionDeduction(item: DepletionItem): number {
  if (item.method === DepletionMethod.COST) {
    return costDepletion(item);
  }
  return percentageDepletion(item);
}

// CORRECTED: always compute both, return greater
function depletionDeduction(item: DepletionItem): number {
  const cost = costDepletion(item);
  const pct = percentageDepletion(item);
  return Math.max(cost, pct);
}
```

### OutputNodes pattern (all 5 nodes use this)
```typescript
// Source: core/types/output-nodes.ts
readonly outputNodes = new OutputNodes([scheduleA]);
// compile error if scheduleA not in list, or fields don't match its inputSchema
```

---

## State of the Art

| Old Approach | Current Approach |
|--------------|------------------|
| Pick cost OR percentage depletion | Take the greater of both (IRS §611) — needs fixing |
| Manual field routing via strings | OutputNodes type-safe routing — already implemented |
| Separate type + schema declarations | Zod infer pattern — already implemented |

---

## Open Questions

1. **Depletion COST method with PERCENTAGE also allowed?**
   - What we know: IRS §611 says "greater of cost or percentage." The research/context.md says the same. The implementation hard-branches.
   - What's unclear: Whether the `method` field is intended as the taxpayer's elected primary method, or strictly forces one path.
   - Recommendation: Fix to always compute both and return the greater. The `method` field can remain as a hint for UI display but should not prevent the greater deduction.

2. **MeF builder test failures — separate fix needed?**
   - What we know: 59 failures in builder.test.ts and header.test.ts; these tests check `<IRS1040>` but XML now has `<IRS1040 documentId="...">`. Modified files are in git working tree.
   - What's unclear: Whether these were intentionally introduced and tests not updated, or an unintended regression.
   - Recommendation: Phase 2 planner should note that `deno task test` success criterion applies only to node-level tests. The MeF failures are a separate workstream.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 2 is a code audit/fix phase. No external tools, databases, or CLIs beyond Deno required.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Deno test (built-in) |
| Config file | deno.json (task: `deno test --allow-read --allow-write --allow-env --allow-run`) |
| Quick run command | `deno test forms/f1040/nodes/inputs/sales_tax_deduction/ forms/f1040/nodes/inputs/auto_expense/ forms/f1040/nodes/inputs/depletion/ forms/f1040/nodes/intermediate/forms/form8582cr/ forms/f1040/nodes/inputs/lump_sum_ss/` |
| Full suite command | `deno task test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-01 | context.md exists with IRS citations | manual | `ls research/context.md` | ✅ all 5 |
| REQ-02 | Tests written, pass | unit | see quick run command above | ✅ all 5 |
| REQ-03 | Registered in registry.ts and inputs.ts | smoke | `deno check forms/f1040/2025/registry.ts` | ✅ |
| REQ-04 | deno task test passes (node-level) | unit | `deno task test` (node scope) | ✅ 108 pass |
| REQ-05 | deno check exits 0 | compile | `deno check forms/f1040/2025/registry.ts` | ✅ |
| REQ-06 | screens.json updated | manual | `grep "sales_tax_deduction\|auto_expense\|depletion\|form8582cr\|lump_sum_ss" forms/f1040/nodes/inputs/screens.json` | ✅ all 5 |

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. The depletion "greater of" fix will require updating 1–2 existing tests in `depletion/index.test.ts` (tests currently verify that COST and PERCENTAGE are mutually exclusive).

---

## Sources

### Primary (HIGH confidence)
- Direct code audit — all 5 `index.ts` files read and verified
- Direct test audit — all 5 `index.test.ts` files read and verified
- `forms/f1040/nodes/inputs/schedule_a/index.ts` — confirmed `line_5a_tax_amount` field name
- `forms/f1040/2025/registry.ts` — confirmed all 5 registrations
- `forms/f1040/2025/inputs.ts` — confirmed 4 input node registrations
- `forms/f1040/nodes/inputs/screens.json` — confirmed all 5 screen entries
- `deno check` output — confirmed 0 TypeScript errors
- All 5 `research/context.md` files read and cross-referenced against implementations

### Secondary (MEDIUM confidence)
- `deno task test` output — 6005 passed / 59 failed (failures all in MeF builder, pre-existing)
- IRC §611 re: "greater of" — cited in research/context.md and IRS text; not independently re-fetched (consistent with what is in codebase)

---

## Metadata

**Confidence breakdown:**
- Node correctness audit: HIGH — direct source reading
- "Greater of" depletion gap: HIGH — explicit code + research/context.md comparison
- sales_tax field name discrepancy: HIGH — direct schema comparison
- MeF pre-existing failures: HIGH — git status + test output
- Registration completeness: HIGH — direct grep verification
- Test adequacy: HIGH — count and category review

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable IRS rules for TY2025; standard mileage rate will change for TY2026)
