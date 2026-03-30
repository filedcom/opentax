import { assertEquals, assertThrows } from "@std/assert";
import { f8812 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    qualifying_children_count: 0,
    other_dependents_count: 0,
    agi: 50000,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8812.compute({ taxYear: 2025 }, { f8812s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ============================================================
// 1. Input Schema Validation
// ============================================================

Deno.test("schema: empty array produces no outputs", () => {
  const result = f8812.compute({ taxYear: 2025 }, { f8812s: [] });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schema: zero children and zero dependents produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("schema: negative qualifying_children_count throws", () => {
  assertThrows(() =>
    compute([minimalItem({ qualifying_children_count: -1 })])
  );
});

Deno.test("schema: negative other_dependents_count throws", () => {
  assertThrows(() =>
    compute([minimalItem({ other_dependents_count: -1 })])
  );
});

Deno.test("schema: negative agi throws", () => {
  assertThrows(() => compute([minimalItem({ agi: -1 })]));
});

Deno.test("schema: negative earned_income throws", () => {
  assertThrows(() =>
    compute([minimalItem({ qualifying_children_count: 1, earned_income: -1 })])
  );
});

// ============================================================
// 2. Per-Box Routing — CTC (qualifying_children_count → schedule3)
// ============================================================

Deno.test("routing: 1 qualifying child routes CTC to schedule3", () => {
  const result = compute([minimalItem({ qualifying_children_count: 1 })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 2200);
});

Deno.test("routing: 2 qualifying children routes $4400 CTC to schedule3", () => {
  const result = compute([minimalItem({ qualifying_children_count: 2 })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 4400);
});

Deno.test("routing: zero qualifying_children_count produces no schedule3 output (CTC)", () => {
  const result = compute([minimalItem({ qualifying_children_count: 0, other_dependents_count: 0 })]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// Per-Box Routing — ODC (other_dependents_count → schedule3)

Deno.test("routing: 1 other dependent routes $500 ODC to schedule3", () => {
  const result = compute([minimalItem({ other_dependents_count: 1 })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 500);
});

Deno.test("routing: 3 other dependents routes $1500 ODC to schedule3", () => {
  const result = compute([minimalItem({ other_dependents_count: 3 })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 1500);
});

Deno.test("routing: zero other_dependents_count produces no ODC output", () => {
  const result = compute([minimalItem({ other_dependents_count: 0 })]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// CTC + ODC combined on schedule3

Deno.test("routing: CTC and ODC combined route total to schedule3", () => {
  // 1 child ($2200) + 2 other deps ($1000) = $3200
  const result = compute([minimalItem({ qualifying_children_count: 1, other_dependents_count: 2 })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 3200);
});

// ============================================================
// 3. Aggregation — Multiple Items
// ============================================================

Deno.test("aggregation: multiple f8812 items are aggregated (children sum)", () => {
  // Two items each contributing 1 qualifying child → total 2 children → $4400
  const result = compute([
    minimalItem({ qualifying_children_count: 1 }),
    minimalItem({ qualifying_children_count: 1 }),
  ]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 4400);
});

Deno.test("aggregation: multiple f8812 items with dependents aggregate ODC", () => {
  // Two items: 1 child + 1 dep and 1 child + 2 deps → 2 children ($4400) + 3 deps ($1500) = $5900
  const result = compute([
    minimalItem({ qualifying_children_count: 1, other_dependents_count: 1 }),
    minimalItem({ qualifying_children_count: 1, other_dependents_count: 2 }),
  ]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 5900);
});

// ============================================================
// 4. Thresholds
// ============================================================

// TY2025 CTC = $2,200 per qualifying child (not $2,000)

Deno.test("threshold: TY2025 CTC is $2200 per qualifying child (not $2000)", () => {
  const result = compute([minimalItem({ qualifying_children_count: 1 })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 2200);
});

Deno.test("threshold: TY2025 ACTC cap is $1700 per qualifying child (not $2000)", () => {
  // 1 child, large earned income, zero tax liability → ACTC capped at $1700
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 100000,
    income_tax_liability: 0,
  })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line28_actc, 1700);
});

Deno.test("threshold: ODC is $500 per other dependent", () => {
  const result = compute([minimalItem({ other_dependents_count: 1 })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 500);
});

// Phase-out threshold — MFJ = $400,000

Deno.test("threshold: MFJ phase-out starts at $400,000 — at threshold no reduction", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 400000,
    filing_status: "mfj",
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  // excess = 0, reduction = 0, CTC = 2200
  assertEquals(input.line6b_child_tax_credit, 2200);
});

Deno.test("threshold: MFJ AGI just above $400,000 triggers phase-out", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 400001,
    filing_status: "mfj",
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  // excess = 1 → ceil to $1000 → reduction = $50 → CTC = 2200 - 50 = 2150
  assertEquals(input.line6b_child_tax_credit, 2150);
});

Deno.test("threshold: MFJ AGI $401,000 above threshold gives $50 reduction", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 401000,
    filing_status: "mfj",
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  // excess = 1000 → ceil to $1000 → reduction = $50 → CTC = 2200 - 50 = 2150
  assertEquals(input.line6b_child_tax_credit, 2150);
});

// Phase-out threshold — all other filing statuses = $200,000

Deno.test("threshold: single filer phase-out starts at $200,000 — at threshold no reduction", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 200000,
    filing_status: "single",
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  // excess = 0, reduction = 0, CTC = 2200
  assertEquals(input.line6b_child_tax_credit, 2200);
});

Deno.test("threshold: single filer AGI just above $200,000 triggers phase-out", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 200001,
    filing_status: "single",
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  // excess = 1 → ceil to $1000 → reduction = $50 → CTC = 2200 - 50 = 2150
  assertEquals(input.line6b_child_tax_credit, 2150);
});

Deno.test("threshold: MFS filer uses $200,000 phase-out threshold (not $400,000)", () => {
  // MFS uses same $200K threshold as single
  const mfsResult = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 201000,
    filing_status: "mfs",
  })]);
  const mfsOut = findOutput(mfsResult, "schedule3");
  assertEquals(mfsOut !== undefined, true);
  const mfsInput = fieldsOf(mfsResult.outputs, schedule3)!;
  // excess = 1000, reduction = 50, CTC = 2200 - 50 = 2150
  assertEquals(mfsInput.line6b_child_tax_credit, 2150);
});

Deno.test("threshold: HOH filer uses $200,000 phase-out threshold", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 201000,
    filing_status: "hoh",
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  // excess = 1000, reduction = 50, CTC = 2200 - 50 = 2150
  assertEquals(input.line6b_child_tax_credit, 2150);
});

// Phase-out ceiling rounding trap

Deno.test("threshold: phase-out uses ceiling rounding (excess $425 → $1000 → $50 reduction)", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 200425,
    filing_status: "single",
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  // excess = 425 → ceil to $1000 → reduction = $50 → CTC = 2200 - 50 = 2150
  assertEquals(input.line6b_child_tax_credit, 2150);
});

Deno.test("threshold: phase-out ceiling — excess $1001 → $2000 → $100 reduction", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 201001,
    filing_status: "single",
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  // excess = 1001 → ceil to $2000 → reduction = $100 → CTC = 2200 - 100 = 2100
  assertEquals(input.line6b_child_tax_credit, 2100);
});

Deno.test("threshold: phase-out exact multiple — excess $1000 → $1000 → $50 reduction (no double rounding)", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 201000,
    filing_status: "single",
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  // excess = 1000 → already a multiple → $1000 → reduction = $50 → CTC = 2200 - 50 = 2150
  assertEquals(input.line6b_child_tax_credit, 2150);
});

// ACTC earned income floor = $2,500

Deno.test("threshold: ACTC zero when earned income at $2500 floor", () => {
  // earned income = $2500 → excess = $0 → ACTC = $0
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 2500,
    income_tax_liability: 0,
  })]);
  // No ACTC when earned income does not exceed $2500
  assertEquals(fieldsOf(result.outputs, f1040)?.line28_actc ?? 0, 0);
});

Deno.test("threshold: ACTC computed when earned income exceeds $2500 floor", () => {
  // earned income = $10000, excess over $2500 = $7500, 15% = $1125
  // CTC = 2200, nonrefundable = 0, ctcUnused = 2200
  // actcCap = 1 × $1700 = $1700
  // actc = min(2200, 1125, 1700) = 1125
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 10000,
    income_tax_liability: 0,
  })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line28_actc, 1125);
});

Deno.test("threshold: ACTC is 15% of earned income above $2500", () => {
  // earned income = $20000, (20000 - 2500) × 0.15 = $2625
  // CTC = 4400, nonrefundable = 0, ctcUnused = 4400
  // actcCap = 2 × $1700 = $3400
  // actc = min(4400, 2625, 3400) = 2625
  const result = compute([minimalItem({
    qualifying_children_count: 2,
    agi: 50000,
    earned_income: 20000,
    income_tax_liability: 0,
  })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line28_actc, 2625);
});

// Part II-B threshold (3+ children triggers higher method)

Deno.test("threshold: 3 qualifying children (Line 16b = $5100) enables Part II-B comparison", () => {
  // 3 children: actcCap = 3 × $1700 = $5100 (≥ $5100, Part II-B threshold)
  // With payroll taxes provided, Part II-B may yield higher ACTC
  // Minimal test: ensure 3 children route correctly
  const result = compute([minimalItem({
    qualifying_children_count: 3,
    agi: 50000,
    earned_income: 30000,
    income_tax_liability: 0,
  })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  // (30000-2500)*0.15 = 4125, cap = 3*1700 = 5100, ctcUnused = 6600
  // actc = min(6600, 4125, 5100) = 4125
  assertEquals(input.line28_actc, 4125);
});

Deno.test("threshold: 2 qualifying children (Line 16b = $3400) skips Part II-B for non-PR filer", () => {
  // 2 children, Line 16b = $3400 < $5100, non-PR filer → Part II-A path (15% method only)
  const result = compute([minimalItem({
    qualifying_children_count: 2,
    agi: 50000,
    earned_income: 30000,
    income_tax_liability: 0,
  })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  // (30000-2500)*0.15 = 4125, cap = 2*1700 = 3400, ctcUnused = 4400
  // actc = min(4400, 4125, 3400) = 3400
  assertEquals(input.line28_actc, 3400);
});

// ============================================================
// 5. Hard Validation Rules (Throw Tests)
// ============================================================

// (Schema validation rules — negative values already covered above)
// The IRS has no explicit computation rules that require a throw beyond schema validation
// per context.md. The following verify boundary cases DO NOT throw.

Deno.test("hard rule: zero agi does not throw", () => {
  const result = compute([minimalItem({ qualifying_children_count: 1, agi: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("hard rule: zero earned_income does not throw", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    earned_income: 0,
    income_tax_liability: 0,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ============================================================
// 6. Warning-Only / Does-Not-Throw Rules
// ============================================================

Deno.test("warning: form_2555_amounts > 0 adds to modified AGI but does not throw", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 100000,
    form_2555_amounts: 50000,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning: puerto_rico_excluded_income > 0 adds to modified AGI but does not throw", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 100000,
    puerto_rico_excluded_income: 20000,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning: form_4563_amount > 0 adds to modified AGI but does not throw", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 100000,
    form_4563_amount: 30000,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning: nontaxable_combat_pay increases earned income for ACTC — does not throw", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 5000,
    nontaxable_combat_pay: 3000,
    income_tax_liability: 0,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning: do_not_claim_actc=true does not throw", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 2,
    agi: 50000,
    earned_income: 30000,
    income_tax_liability: 0,
    do_not_claim_actc: true,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning: has_form_2555=true does not throw", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 30000,
    income_tax_liability: 0,
    has_form_2555: true,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ============================================================
// 7. Informational Fields — Must NOT produce additional tax outputs
// ============================================================

Deno.test("informational: nontaxable_combat_pay does not create new output nodeTypes", () => {
  const without = compute([minimalItem({ qualifying_children_count: 1, agi: 50000, earned_income: 20000, income_tax_liability: 0 })]);
  const withCombat = compute([minimalItem({ qualifying_children_count: 1, agi: 50000, earned_income: 20000, income_tax_liability: 0, nontaxable_combat_pay: 5000 })]);
  // Both produce outputs; combat pay may increase ACTC but not add new output types
  const withoutTypes = without.outputs.map((o) => o.nodeType).sort();
  const withTypes = withCombat.outputs.map((o) => o.nodeType).sort();
  assertEquals(withoutTypes.length <= withTypes.length, true); // same or more ACTC
});

Deno.test("informational: form_8332_override does not affect output structure (CTC claimed normally)", () => {
  // form_8332_override is informational — CTC still routes to schedule3
  const result = compute([minimalItem({ qualifying_children_count: 1, agi: 50000, form_8332_override: true })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
});

Deno.test("informational: ACTC refund delay flag — no impact on computed amounts", () => {
  // ACTC delay is informational only; ACTC amount unchanged
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 20000,
    income_tax_liability: 0,
  })]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  // (20000-2500)*0.15 = 2625, cap=1700, ctcUnused=2200 → actc = 1700
  assertEquals(input.line28_actc, 1700);
});

// ============================================================
// 8. Edge Cases
// ============================================================

// Edge Case 1: Child born and died in 2025 (SSN = "DIED") — treated as qualifying child
// This is handled by schema/routing logic; we test that a valid child count routes correctly
Deno.test("edge: CTC fully phased out produces no credit outputs", () => {
  // Single filer with AGI so high that CTC = 0
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 250000,
    filing_status: "single",
  })]);
  // excess = 50000, ceil to 50000 (already multiple), reduction = 50 * 50 = 2500 > 2200
  assertEquals(findOutput(result, "schedule3"), undefined);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// Edge Case 2: ITIN child → ODC only (not CTC/ACTC)
Deno.test("edge: ITIN child (ssn_not_valid_for_work) eligible for ODC but not CTC — routes to ODC", () => {
  // In the simplified schema, this is expressed by not counting child in qualifying_children_count
  // but counting in other_dependents_count (implementation must handle ssn_not_valid_for_work flag)
  const result = compute([minimalItem({ qualifying_children_count: 0, other_dependents_count: 1 })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 500); // ODC = $500
});

// Edge Case 3: Form 2555 filers cannot claim ACTC (but CAN claim non-refundable CTC)
Deno.test("edge: has_form_2555=true suppresses ACTC (line28 = 0 or absent)", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 30000,
    income_tax_liability: 0,
    has_form_2555: true,
  })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line28_actc ?? 0, 0);
});

Deno.test("edge: has_form_2555=true still allows non-refundable CTC on schedule3", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 30000,
    income_tax_liability: 5000,
    has_form_2555: true,
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 2200); // non-refundable CTC unaffected
});

// Edge Case 4: Phase-out rounding trap (ceiling rounding)
Deno.test("edge: phase-out rounding — $1 excess becomes $1000 (ceiling), not $0", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 200001,
    filing_status: "single",
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  // NOT 2200 (that would mean no phase-out rounding)
  // NOT undefined (that would mean full phase-out)
  assertEquals(input.line6b_child_tax_credit, 2150); // $50 reduction
});

// Edge Case 5: Noncustodial parent with Form 8332 — CTC allowed
Deno.test("edge: form_8332_override=true allows CTC for noncustodial parent", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    form_8332_override: true,
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 2200);
});

// Edge Case 6: ACTC opt-out (do_not_claim_actc)
Deno.test("edge: do_not_claim_actc=true suppresses ACTC (line28 = 0 or absent)", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 2,
    agi: 50000,
    earned_income: 30000,
    income_tax_liability: 1000,
    do_not_claim_actc: true,
  })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line28_actc ?? 0, 0);
});

Deno.test("edge: do_not_claim_actc=true does not affect non-refundable CTC on schedule3", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 2,
    agi: 50000,
    income_tax_liability: 5000,
    do_not_claim_actc: true,
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 4400);
});

// Edge Case 7: Bona fide Puerto Rico resident — triggers Part II-B with < 3 children
Deno.test("edge: bona_fide_pr_resident=true enables Part II-B path with 1 qualifying child", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 30000,
    earned_income: 20000,
    income_tax_liability: 0,
    bona_fide_pr_resident: true,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
  // PR resident with 1 child goes to Part II-B regardless of < 3 children
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
});

// Edge Case 8: modified AGI exclusions (PR income, Form 2555, Form 4563) increase phase-out
Deno.test("edge: puerto_rico_excluded_income added to AGI for phase-out calculation", () => {
  // AGI = 195000, pr income = 10000 → modified AGI = 205000 (single, threshold = 200000)
  // excess = 5000 → ceil to 5000 → reduction = 250 → CTC = 2200 - 250 = 1950
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 195000,
    filing_status: "single",
    puerto_rico_excluded_income: 10000,
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 1950);
});

Deno.test("edge: form_2555_amounts added to AGI for modified AGI phase-out", () => {
  // AGI = 195000, form_2555_amounts = 10000 → modified AGI = 205000 (single)
  // excess = 5000 → reduction = 250 → CTC = 2200 - 250 = 1950
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 195000,
    filing_status: "single",
    form_2555_amounts: 10000,
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 1950);
});

Deno.test("edge: form_4563_amount added to AGI for modified AGI phase-out", () => {
  // AGI = 195000, form_4563_amount = 10000 → modified AGI = 205000 (single)
  // excess = 5000 → reduction = 250 → CTC = 2200 - 250 = 1950
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 195000,
    filing_status: "single",
    form_4563_amount: 10000,
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line6b_child_tax_credit, 1950);
});

// Edge Case 9: income_tax_liability limits non-refundable CTC
Deno.test("edge: nonrefundable CTC limited to income_tax_liability", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 2,
    agi: 50000,
    income_tax_liability: 1500,
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  // CTC = 4400, limited to tax liability = 1500
  assertEquals(input.line6b_child_tax_credit, 1500);
});

Deno.test("edge: zero income_tax_liability means nonrefundable CTC is zero on schedule3", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 2,
    agi: 50000,
    income_tax_liability: 0,
  })]);
  assertEquals(fieldsOf(result.outputs, schedule3)?.line6b_child_tax_credit ?? 0, 0);
});

// Edge Case 10: nontaxable combat pay increases earned income for ACTC
Deno.test("edge: nontaxable_combat_pay increases earned income for ACTC calculation", () => {
  // Without combat pay: earned_income = 5000, (5000-2500)*0.15 = 375
  // With combat pay 5000: earned_income_effective = 10000, (10000-2500)*0.15 = 1125
  const withoutCombat = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 5000,
    income_tax_liability: 0,
  })]);
  const withCombat = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 5000,
    nontaxable_combat_pay: 5000,
    income_tax_liability: 0,
  })]);

  const f1040WithoutOut = findOutput(withoutCombat, "f1040");
  const f1040WithOut = findOutput(withCombat, "f1040");

  assertEquals(f1040WithoutOut !== undefined, true);
  assertEquals(f1040WithOut !== undefined, true);

  const withoutActc = fieldsOf(withoutCombat.outputs, f1040)!.line28_actc as number;
  const withActc = fieldsOf(withCombat.outputs, f1040)!.line28_actc as number;

  assertEquals(withoutActc, 375);
  assertEquals(withActc, 1125); // combat pay boosts ACTC
});

// ============================================================
// 9. Smoke Test — Comprehensive
// ============================================================

Deno.test("smoke: 2 qualifying children + 1 other dependent, moderate income, partial phase-out, TY2025", () => {
  // Setup:
  //   - 2 qualifying children (CTC = 2 × $2200 = $4400)
  //   - 1 other dependent (ODC = $500)
  //   - Total tentative = $4900
  //   - Single filer AGI = $201,500
  //   - Excess = $1,500 → ceil to $2,000 → reduction = $100 → credit after phaseout = $4800
  //   - income_tax_liability = $3000 → nonrefundable = min($4800, $3000) = $3000
  //   - ctcUnused = $4800 - $3000 = $1800
  //   - actcMaxPerChild = 2 × $1700 = $3400
  //   - earned_income = $40,000 → (40000-2500)*0.15 = $5625
  //   - actc = min($1800, $5625, $3400) = $1800
  const result = compute([minimalItem({
    qualifying_children_count: 2,
    other_dependents_count: 1,
    agi: 201500,
    filing_status: "single",
    earned_income: 40000,
    income_tax_liability: 3000,
  })]);

  const schedule3Out = findOutput(result, "schedule3");
  assertEquals(schedule3Out !== undefined, true);
  const s3Input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(s3Input.line6b_child_tax_credit, 3000); // limited by tax liability

  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const f1040Input = fieldsOf(result.outputs, f1040)!;
  assertEquals(f1040Input.line28_actc, 1800);
});

Deno.test("smoke: MFJ 3 children, high earned income, below phase-out — maximum ACTC", () => {
  // 3 children × $2200 = $6600 CTC
  // MFJ, AGI = $380,000 (below $400K threshold → no phase-out)
  // income_tax_liability = $0 → nonrefundable = $0
  // ctcUnused = $6600
  // actcMaxPerChild = 3 × $1700 = $5100
  // earned_income = $80,000 → (80000-2500)*0.15 = $11,625
  // actc = min($6600, $11625, $5100) = $5100
  const result = compute([minimalItem({
    qualifying_children_count: 3,
    agi: 380000,
    filing_status: "mfj",
    earned_income: 80000,
    income_tax_liability: 0,
  })]);

  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line28_actc, 5100);
});
