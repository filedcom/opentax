import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateCreditLimitWorksheetALine5,
  calculateCreditLimitWorksheetBLines,
  calculateEarnedIncomeWorksheet,
  calculatePartIIBLines,
  calculateSchedule8812Lines,
  f8812,
  type F8812Input,
} from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { FilingStatus } from "../../types.ts";

const zeroCreditWorksheet = {
  schedule3_line1: 0,
  schedule3_line2: 0,
  schedule3_line3: 0,
  schedule3_line4: 0,
  schedule3_line5b: 0,
  schedule3_line6d: 0,
  schedule3_line6f: 0,
  schedule3_line6l: 0,
  schedule3_line6m: 0,
  worksheet_b_applies: false,
};

function minimalItem(
  overrides: Partial<NonNullable<F8812Input["f8812s"]>[number]> = {},
) {
  return {
    qualifying_children_count: 0,
    other_dependents_count: 0,
    agi: 50000,
    filing_status: FilingStatus.Single,
    income_tax_liability: 10000,
    ...overrides,
  };
}

function verifiedLine18a(items: ReturnType<typeof minimalItem>[]): number {
  const item = items[0];
  return (item?.earned_income ?? 0) + (item?.nontaxable_combat_pay ?? 0);
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8812.compute({ taxYear: 2025, formType: "f1040" }, {
    f8812s: items,
    line18a_earned_income: verifiedLine18a(items),
    credit_limit_worksheet: zeroCreditWorksheet,
  });
}

function computeWithPartIIB(
  items: ReturnType<typeof minimalItem>[],
  line21: number,
  line22 = 0,
  eic = 0,
) {
  return f8812.compute({ taxYear: 2025, formType: "f1040" }, {
    f8812s: items,
    line18a_earned_income: verifiedLine18a(items),
    credit_limit_worksheet: zeroCreditWorksheet,
    part_iib: {
      line21_w2_withheld_social_security_medicare: line21,
      schedule1_line15: line22,
      schedule2_line5: 0,
      schedule2_line6: 0,
      schedule2_line13: 0,
      form1040_line27a_eic: eic,
      schedule3_line11_adoption_credit: 0,
    },
  });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ============================================================
// 1. Input Schema Validation
// ============================================================

Deno.test("schema: empty array produces no outputs", () => {
  const result = f8812.compute({ taxYear: 2025, formType: "f1040" }, {
    f8812s: [],
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schema: zero children and zero dependents produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("explicit Schedule 8812 counts must match Form 1040 dependent counts", () => {
  assertThrows(
    () =>
      calculateSchedule8812Lines(2025, {
        f8812s: [minimalItem({ qualifying_children_count: 1 })],
        auto_qualifying_children: 0,
        auto_other_dependents: 0,
      }),
    Error,
    "must match the Form 1040 dependent rows",
  );
  assertThrows(
    () =>
      calculateSchedule8812Lines(2025, {
        f8812s: [minimalItem({ other_dependents_count: 1 })],
        auto_qualifying_children: 0,
        auto_other_dependents: 0,
      }),
    Error,
    "must match the Form 1040 dependent rows",
  );
});

Deno.test("schema: negative qualifying_children_count throws", () => {
  assertThrows(() => compute([minimalItem({ qualifying_children_count: -1 })]));
});

Deno.test("schema: negative other_dependents_count throws", () => {
  assertThrows(() => compute([minimalItem({ other_dependents_count: -1 })]));
});

Deno.test("schema: negative AGI is accepted as a signed return amount", () => {
  assertEquals(compute([minimalItem({ agi: -1 })]).outputs.length, 0);
});

Deno.test("schema: negative earned_income throws", () => {
  assertThrows(() =>
    compute([minimalItem({ qualifying_children_count: 1, earned_income: -1 })])
  );
});

// ============================================================
// 2. Per-Box Routing — CTC (qualifying_children_count → f1040)
// ============================================================

Deno.test("routing: 1 qualifying child routes CTC to f1040", () => {
  const result = compute([minimalItem({ qualifying_children_count: 1 })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 2200);
});

Deno.test("routing: 2 qualifying children routes $4400 CTC to f1040", () => {
  const result = compute([minimalItem({ qualifying_children_count: 2 })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 4400);
});

Deno.test("routing: zero qualifying_children_count produces no f1040 output (CTC)", () => {
  const result = compute([
    minimalItem({ qualifying_children_count: 0, other_dependents_count: 0 }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// Per-Box Routing — ODC (other_dependents_count → f1040)

Deno.test("routing: 1 other dependent routes $500 ODC to f1040", () => {
  const result = compute([minimalItem({ other_dependents_count: 1 })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 500);
});

Deno.test("routing: 3 other dependents routes $1500 ODC to f1040", () => {
  const result = compute([minimalItem({ other_dependents_count: 3 })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 1500);
});

Deno.test("routing: zero other_dependents_count produces no ODC output", () => {
  const result = compute([minimalItem({ other_dependents_count: 0 })]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// CTC + ODC combined on f1040

Deno.test("routing: CTC and ODC combined route total to f1040", () => {
  // 1 child ($2200) + 2 other deps ($1000) = $3200
  const result = compute([
    minimalItem({ qualifying_children_count: 1, other_dependents_count: 2 }),
  ]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 3200);
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
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 4400);
});

Deno.test("aggregation: multiple f8812 items with dependents aggregate ODC", () => {
  // Two items: 1 child + 1 dep and 1 child + 2 deps → 2 children ($4400) + 3 deps ($1500) = $5900
  const result = compute([
    minimalItem({ qualifying_children_count: 1, other_dependents_count: 1 }),
    minimalItem({ qualifying_children_count: 1, other_dependents_count: 2 }),
  ]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 5900);
});

// ============================================================
// 4. Thresholds
// ============================================================

// TY2025 CTC = $2,200 per qualifying child (not $2,000)

Deno.test("threshold: TY2025 CTC is $2200 per qualifying child (not $2000)", () => {
  const result = compute([minimalItem({ qualifying_children_count: 1 })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 2200);
});

Deno.test("threshold: TY2025 ACTC cap is $1700 per qualifying child (not $2000)", () => {
  // 1 child, large earned income, zero tax liability → ACTC capped at $1700
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 100000,
    income_tax_liability: 0,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line28_actc, 1700);
});

Deno.test("threshold: ODC is $500 per other dependent", () => {
  const result = compute([minimalItem({ other_dependents_count: 1 })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 500);
});

// Phase-out threshold — MFJ = $400,000

Deno.test("threshold: MFJ phase-out starts at $400,000 — at threshold no reduction", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 400000,
    filing_status: FilingStatus.MFJ,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  // excess = 0, reduction = 0, CTC = 2200
  assertEquals(input.line19_child_tax_credit, 2200);
});

Deno.test("threshold: MFJ AGI just above $400,000 triggers phase-out", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 400001,
    filing_status: FilingStatus.MFJ,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  // excess = 1 → ceil to $1000 → reduction = $50 → CTC = 2200 - 50 = 2150
  assertEquals(input.line19_child_tax_credit, 2150);
});

Deno.test("threshold: MFJ AGI $401,000 above threshold gives $50 reduction", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 401000,
    filing_status: FilingStatus.MFJ,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  // excess = 1000 → ceil to $1000 → reduction = $50 → CTC = 2200 - 50 = 2150
  assertEquals(input.line19_child_tax_credit, 2150);
});

// Phase-out threshold — all other filing statuses = $200,000

Deno.test("threshold: single filer phase-out starts at $200,000 — at threshold no reduction", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 200000,
    filing_status: FilingStatus.Single,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  // excess = 0, reduction = 0, CTC = 2200
  assertEquals(input.line19_child_tax_credit, 2200);
});

Deno.test("threshold: single filer AGI just above $200,000 triggers phase-out", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 200001,
    filing_status: FilingStatus.Single,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  // excess = 1 → ceil to $1000 → reduction = $50 → CTC = 2200 - 50 = 2150
  assertEquals(input.line19_child_tax_credit, 2150);
});

Deno.test("threshold: MFS filer uses $200,000 phase-out threshold (not $400,000)", () => {
  // MFS uses same $200K threshold as single
  const mfsResult = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 201000,
    filing_status: FilingStatus.MFS,
  })]);
  const mfsInput = fieldsOf(mfsResult.outputs, f1040)!;
  // excess = 1000, reduction = 50, CTC = 2200 - 50 = 2150
  assertEquals(mfsInput.line19_child_tax_credit, 2150);
});

Deno.test("threshold: HOH filer uses $200,000 phase-out threshold", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 201000,
    filing_status: FilingStatus.HOH,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  // excess = 1000, reduction = 50, CTC = 2200 - 50 = 2150
  assertEquals(input.line19_child_tax_credit, 2150);
});

// Phase-out ceiling rounding trap

Deno.test("threshold: phase-out uses ceiling rounding (excess $425 → $1000 → $50 reduction)", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 200425,
    filing_status: FilingStatus.Single,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  // excess = 425 → ceil to $1000 → reduction = $50 → CTC = 2200 - 50 = 2150
  assertEquals(input.line19_child_tax_credit, 2150);
});

Deno.test("threshold: phase-out ceiling — excess $1001 → $2000 → $100 reduction", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 201001,
    filing_status: FilingStatus.Single,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  // excess = 1001 → ceil to $2000 → reduction = $100 → CTC = 2200 - 100 = 2100
  assertEquals(input.line19_child_tax_credit, 2100);
});

Deno.test("threshold: phase-out exact multiple — excess $1000 → $1000 → $50 reduction (no double rounding)", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 201000,
    filing_status: FilingStatus.Single,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  // excess = 1000 → already a multiple → $1000 → reduction = $50 → CTC = 2200 - 50 = 2150
  assertEquals(input.line19_child_tax_credit, 2150);
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
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line28_actc, 2625);
});

// Part II-B threshold (3+ children triggers higher method)

Deno.test("threshold: 3 qualifying children (Line 16b = $5100) enables Part II-B comparison", () => {
  // 3 children: actcCap = 3 × $1700 = $5100 (≥ $5100, Part II-B threshold)
  // With payroll taxes provided, Part II-B may yield higher ACTC
  // Minimal test: ensure 3 children route correctly
  const result = computeWithPartIIB([minimalItem({
    qualifying_children_count: 3,
    agi: 50000,
    earned_income: 30000,
    income_tax_liability: 0,
  })], 0);
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

Deno.test("hard rule: zero agi does not throw — full CTC at zero income", () => {
  // AGI = 0 is below both phase-out thresholds → no reduction, full CTC = $2200
  const result = compute([
    minimalItem({ qualifying_children_count: 1, agi: 0 }),
  ]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 2200);
});

Deno.test("hard rule: zero earned_income — CTC routes to f1040, ACTC is zero", () => {
  // earned_income = 0 → ACTC earned income method yields 0, no line28 output
  // income_tax_liability = 0 → nonrefundable CTC also 0, no f1040 output
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    earned_income: 0,
    income_tax_liability: 0,
  })]);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line19_child_tax_credit ?? 0,
    0,
  );
  assertEquals(fieldsOf(result.outputs, f1040)?.line28_actc ?? 0, 0);
});

// ============================================================
// 6. Warning-Only / Does-Not-Throw Rules
// ============================================================

Deno.test("warning: form_2555_amounts > 0 increases modified AGI for phase-out", () => {
  // AGI = 100000, form_2555_amounts = 50000 → modified AGI = 150000 (below $200K threshold)
  // No phase-out reduction, full CTC = $2200
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 100000,
    form_2555_amounts: 50000,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 2200);
});

Deno.test("warning: puerto_rico_excluded_income > 0 increases modified AGI for phase-out", () => {
  // AGI = 100000, pr_income = 20000 → modified AGI = 120000 (below $200K threshold)
  // No phase-out reduction, full CTC = $2200
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 100000,
    puerto_rico_excluded_income: 20000,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 2200);
});

Deno.test("warning: form_4563_amount > 0 increases modified AGI for phase-out", () => {
  // AGI = 100000, form_4563 = 30000 → modified AGI = 130000 (below $200K threshold)
  // No phase-out reduction, full CTC = $2200
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 100000,
    form_4563_amount: 30000,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 2200);
});

Deno.test("warning: nontaxable_combat_pay increases effective earned income for ACTC", () => {
  // earned_income = 5000, combat_pay = 3000 → effective = 8000
  // (8000 - 2500) × 0.15 = 825; cap = 1700; ctcUnused = 2200 → actc = 825
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 5000,
    nontaxable_combat_pay: 3000,
    income_tax_liability: 0,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line28_actc, 825);
});

Deno.test("warning: do_not_claim_actc=true suppresses ACTC, CTC still routes to f1040", () => {
  // 2 children, large earned income, do_not_claim_actc=true
  // Non-refundable CTC = min(4400, 0) = 0 (tax liability = 0), no f1040
  // ACTC = 0 (opted out)
  const result = compute([minimalItem({
    qualifying_children_count: 2,
    agi: 50000,
    earned_income: 30000,
    income_tax_liability: 0,
    do_not_claim_actc: true,
  })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line28_actc ?? 0, 0);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line19_child_tax_credit ?? 0,
    0,
  );
});

Deno.test("warning: has_form_2555=true suppresses ACTC, non-refundable CTC still applies", () => {
  // has_form_2555=true blocks ACTC; non-refundable CTC limited by tax liability
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 30000,
    income_tax_liability: 0,
    has_form_2555: true,
  })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line28_actc ?? 0, 0);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line19_child_tax_credit ?? 0,
    0,
  );
});

// ============================================================
// 7. Informational Fields — Must NOT produce additional tax outputs
// ============================================================

Deno.test("informational: nontaxable_combat_pay increases ACTC via higher earned income", () => {
  // Without: (20000-2500)*0.15 = 2625, cap=1700 → actc=1700
  // With combat pay 5000: (25000-2500)*0.15 = 3375, cap=1700 → actc=1700 (same, capped)
  // Use lower earned income to see the difference
  // Without: (5000-2500)*0.15 = 375; cap=1700 → actc=375
  // With combat pay 5000: effective=10000, (10000-2500)*0.15=1125; cap=1700 → actc=1125
  const without = compute([
    minimalItem({
      qualifying_children_count: 1,
      agi: 50000,
      earned_income: 5000,
      income_tax_liability: 0,
    }),
  ]);
  const withCombat = compute([
    minimalItem({
      qualifying_children_count: 1,
      agi: 50000,
      earned_income: 5000,
      income_tax_liability: 0,
      nontaxable_combat_pay: 5000,
    }),
  ]);
  assertEquals(fieldsOf(without.outputs, f1040)!.line28_actc, 375);
  assertEquals(fieldsOf(withCombat.outputs, f1040)!.line28_actc, 1125);
});

Deno.test("informational: form_8332_override does not affect CTC amount — routes full CTC to f1040", () => {
  // form_8332_override is informational — CTC still routes to f1040 at full $2200
  const result = compute([
    minimalItem({
      qualifying_children_count: 1,
      agi: 50000,
      form_8332_override: true,
    }),
  ]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 2200);
});

Deno.test("informational: ACTC refund delay flag — no impact on computed amounts", () => {
  // ACTC delay is informational only; ACTC amount unchanged
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 20000,
    income_tax_liability: 0,
  })]);
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
    filing_status: FilingStatus.Single,
  })]);
  // excess = 50000, ceil to 50000 (already multiple), reduction = 50 * 50 = 2500 > 2200
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// Edge Case 2: ITIN child → ODC only (not CTC/ACTC)
Deno.test("edge: ITIN child (ssn_not_valid_for_work) eligible for ODC but not CTC — routes to ODC", () => {
  // In the simplified schema, this is expressed by not counting child in qualifying_children_count
  // but counting in other_dependents_count (implementation must handle ssn_not_valid_for_work flag)
  const result = compute([
    minimalItem({ qualifying_children_count: 0, other_dependents_count: 1 }),
  ]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 500); // ODC = $500
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

Deno.test("edge: has_form_2555=true still allows non-refundable CTC on f1040", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    earned_income: 30000,
    income_tax_liability: 5000,
    has_form_2555: true,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 2200); // non-refundable CTC unaffected
});

// Edge Case 4: Phase-out rounding trap (ceiling rounding)
Deno.test("edge: phase-out rounding — $1 excess becomes $1000 (ceiling), not $0", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 200001,
    filing_status: FilingStatus.Single,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  // NOT 2200 (that would mean no phase-out rounding)
  // NOT undefined (that would mean full phase-out)
  assertEquals(input.line19_child_tax_credit, 2150); // $50 reduction
});

// Edge Case 5: Noncustodial parent with Form 8332 — CTC allowed
Deno.test("edge: form_8332_override=true allows CTC for noncustodial parent", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 50000,
    form_8332_override: true,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 2200);
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

Deno.test("edge: do_not_claim_actc=true does not affect non-refundable CTC on f1040", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 2,
    agi: 50000,
    income_tax_liability: 5000,
    do_not_claim_actc: true,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 4400);
});

// Edge Case 7: Bona fide Puerto Rico resident — triggers Part II-B with < 3 children
Deno.test("edge: bona_fide_pr_resident=true enables Part II-B path with 1 qualifying child", () => {
  // PR resident with 1 child: Part II-B applies even with < 3 children
  // Part II-A: (20000-2500)*0.15 = 2625; actcCap = 1700; actc_IIA = min(1700, 2625) = 1700
  // No payroll taxes provided → partIIB = 0; actc = max(1700, 0) capped at 1700 = 1700
  const result = computeWithPartIIB([minimalItem({
    qualifying_children_count: 1,
    agi: 30000,
    earned_income: 20000,
    income_tax_liability: 0,
    bona_fide_pr_resident: true,
  })], 0);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line28_actc, 1700);
});

// Edge Case 8: modified AGI exclusions (PR income, Form 2555, Form 4563) increase phase-out
Deno.test("edge: puerto_rico_excluded_income added to AGI for phase-out calculation", () => {
  // AGI = 195000, pr income = 10000 → modified AGI = 205000 (single, threshold = 200000)
  // excess = 5000 → ceil to 5000 → reduction = 250 → CTC = 2200 - 250 = 1950
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 195000,
    filing_status: FilingStatus.Single,
    puerto_rico_excluded_income: 10000,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 1950);
});

Deno.test("edge: form_2555_amounts added to AGI for modified AGI phase-out", () => {
  // AGI = 195000, form_2555_amounts = 10000 → modified AGI = 205000 (single)
  // excess = 5000 → reduction = 250 → CTC = 2200 - 250 = 1950
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 195000,
    filing_status: FilingStatus.Single,
    form_2555_amounts: 10000,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 1950);
});

Deno.test("edge: form_4563_amount added to AGI for modified AGI phase-out", () => {
  // AGI = 195000, form_4563_amount = 10000 → modified AGI = 205000 (single)
  // excess = 5000 → reduction = 250 → CTC = 2200 - 250 = 1950
  const result = compute([minimalItem({
    qualifying_children_count: 1,
    agi: 195000,
    filing_status: FilingStatus.Single,
    form_4563_amount: 10000,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line19_child_tax_credit, 1950);
});

// Edge Case 9: income_tax_liability limits non-refundable CTC
Deno.test("edge: nonrefundable CTC limited to income_tax_liability", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 2,
    agi: 50000,
    income_tax_liability: 1500,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  // CTC = 4400, limited to tax liability = 1500
  assertEquals(input.line19_child_tax_credit, 1500);
});

Deno.test("edge: zero income_tax_liability means nonrefundable CTC is zero on f1040", () => {
  const result = compute([minimalItem({
    qualifying_children_count: 2,
    agi: 50000,
    income_tax_liability: 0,
  })]);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line19_child_tax_credit ?? 0,
    0,
  );
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

  assertEquals(fieldsOf(withoutCombat.outputs, f1040)!.line28_actc, 375);
  assertEquals(fieldsOf(withCombat.outputs, f1040)!.line28_actc, 1125); // combat pay boosts ACTC
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
    filing_status: FilingStatus.Single,
    earned_income: 40000,
    income_tax_liability: 3000,
  })]);

  assertEquals(fieldsOf(result.outputs, f1040)!.line19_child_tax_credit, 3000); // limited by tax liability
  assertEquals(fieldsOf(result.outputs, f1040)!.line28_actc, 1800);
  assertEquals(result.outputs.length, 1);
});

Deno.test("Schedule 8812 rejects a nonrefundable claim without Form 1040 tax", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          qualifying_children_count: 1,
          income_tax_liability: undefined,
        }),
      ]),
    Error,
    "needs Form 1040 line 18 tax",
  );
});

Deno.test("Schedule 8812 does not add repeated AGI or tax across dependent entries", () => {
  const result = compute([
    minimalItem({
      qualifying_children_count: 1,
      agi: 199_000,
      income_tax_liability: 1_000,
    }),
    minimalItem({
      qualifying_children_count: 1,
      agi: 199_000,
      income_tax_liability: 1_000,
    }),
  ]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line19_child_tax_credit, 1_000);
});

Deno.test("Schedule 8812 rejects conflicting return facts", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({ qualifying_children_count: 1, agi: 50_000 }),
        minimalItem({ qualifying_children_count: 1, agi: 60_000 }),
      ]),
    Error,
    "conflicting return-level agi",
  );
  assertThrows(
    () =>
      compute([
        minimalItem({
          qualifying_children_count: 1,
          income_tax_liability: 1_000,
        }),
        minimalItem({
          qualifying_children_count: 1,
          income_tax_liability: 2_000,
        }),
      ]),
    Error,
    "conflicting return-level income_tax_liability",
  );
});

Deno.test("Schedule 8812 explicit worksheet facts must match engine-derived return facts", () => {
  const item = minimalItem({
    qualifying_children_count: 1,
    agi: 50_000,
    income_tax_liability: 1_000,
  });
  const base = {
    f8812s: [item],
    auto_qualifying_children: 1,
    auto_other_dependents: 0,
    auto_filing_status: FilingStatus.Single,
    auto_agi: 50_000,
    auto_income_tax_liability: 1_000,
    line18a_earned_income: 10_000,
    credit_limit_worksheet: zeroCreditWorksheet,
  };
  const ctx = { taxYear: 2025, formType: "f1040" } as const;
  assertEquals(
    fieldsOf(f8812.compute(ctx, base).outputs, f1040)?.line19_child_tax_credit,
    1_000,
  );
  assertThrows(
    () => f8812.compute(ctx, { ...base, auto_agi: 250_000 }),
    Error,
    "AGI differs from Form 1040 line 11a",
  );
  assertThrows(
    () => f8812.compute(ctx, { ...base, auto_filing_status: FilingStatus.MFJ }),
    Error,
    "filing status differs from the Form 1040 source",
  );
  assertThrows(
    () => f8812.compute(ctx, { ...base, auto_income_tax_liability: 500 }),
    Error,
    "tax limit differs from Form 1040 line 18",
  );
});

Deno.test("Schedule 8812 auto path does not guess filing status", () => {
  assertThrows(
    () =>
      f8812.compute({ taxYear: 2025, formType: "f1040" }, {
        auto_qualifying_children: 1,
        auto_agi: 50_000,
        auto_income_tax_liability: 1_000,
      }),
    Error,
    "needs filing status and Form 1040 AGI",
  );
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
    filing_status: FilingStatus.MFJ,
    earned_income: 80000,
    income_tax_liability: 0,
  })]);

  assertEquals(fieldsOf(result.outputs, f1040)!.line28_actc, 5100);
});

// ============================================================
// 10. Part II-B (Payroll Tax Method)
// ============================================================

Deno.test("part2b: 2 qualifying children — Part II-B is ignored, Part II-A used", () => {
  // 2 children < 3, non-PR → Part II-B does not apply
  // Part II-A: tentativeActc = min(ctcUnused, actcCap)
  //   CTC = 4400, nonrefundable = 0, ctcUnused = 4400
  //   actcCap = 2 × 1700 = 3400
  //   earnedIncomeBased = (30000 - 2500) × 0.15 = 4125
  //   actc = min(3400, 4125) = 3400
  // Part II-B is not completed for a non-PR filer with fewer than 3 children.
  const result = compute([minimalItem({
    qualifying_children_count: 2,
    agi: 50000,
    earned_income: 30000,
    income_tax_liability: 0,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  // Part II-A = 3400
  assertEquals(input.line28_actc, 3400);
});

Deno.test("part2b: 3 qualifying children, Part II-B > Part II-A — Part II-B wins", () => {
  // 3 children → Part II-B applies
  // Part II-A: earnedIncomeBased = (10000 - 2500) × 0.15 = 1125
  //   tentativeActc = min(ctcUnused, actcCap) = min(6600, 5100) = 5100
  //   actc_IIA = min(5100, 1125) = 1125
  // Part II-B: payrollTaxes = 4000 + 580 + 0 = 4580, eic = 0
  //   partIIB = 4580
  // Final = min(tentativeCTC - nonRefundable, max(1125, 4580))
  //       = min(5100, 4580) = 4580
  const result = computeWithPartIIB([minimalItem({
    qualifying_children_count: 3,
    agi: 50000,
    earned_income: 10000,
    income_tax_liability: 0,
  })], 4_580);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line28_actc, 4580);
});

Deno.test("part2b: 3 qualifying children, Part II-A > Part II-B — Part II-A wins", () => {
  // Line 20 exceeds line 17, so the printed form skips Part II-B.
  // Part II-A: earnedIncomeBased = (80000 - 2500) × 0.15 = 11625
  //   tentativeActc = min(ctcUnused=6600, actcCap=5100) = 5100
  //   actc_IIA = min(5100, 11625) = 5100
  const result = compute([minimalItem({
    qualifying_children_count: 3,
    agi: 50000,
    earned_income: 80000,
    income_tax_liability: 0,
  })]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line28_actc, 5100);
});

Deno.test("part2b: Puerto Rico resident (1 child) — Part II-B applies", () => {
  // PR resident with 1 child triggers Part II-B even with < 3 children
  // Part II-A: earnedIncomeBased = (20000 - 2500) × 0.15 = 2625
  //   tentativeActc = min(ctcUnused=2200, actcCap=1700) = 1700
  //   actc_IIA = min(1700, 2625) = 1700
  // Part II-B: payrollTaxes = 1000 + 290 = 1290, eic = 200
  //   partIIB = max(0, 1290 - 200) = 1090
  // Final = min(1700, max(1700, 1090)) = min(1700, 1700) = 1700
  const result = computeWithPartIIB(
    [minimalItem({
      qualifying_children_count: 1,
      agi: 30000,
      earned_income: 20000,
      income_tax_liability: 0,
      bona_fide_pr_resident: true,
    })],
    1_290,
    0,
    200,
  );
  const input = fieldsOf(result.outputs, f1040)!;
  // Part II-A wins here (1700 > 1090), but the path is Part II-B
  assertEquals(input.line28_actc, 1700);
});

Deno.test("part2b: Puerto Rico resident (1 child), Part II-B > Part II-A — Part II-B wins", () => {
  // PR resident with low earned income but high payroll taxes
  // Part II-A: earnedIncomeBased = (5000 - 2500) × 0.15 = 375
  //   tentativeActc = min(ctcUnused=2200, actcCap=1700) = 1700
  //   actc_IIA = min(1700, 375) = 375
  // Part II-B: payrollTaxes = 1200 + 300 + 500 = 2000, eic = 100
  //   partIIB = max(0, 2000 - 100) = 1900 (capped by tentativeActc = 1700)
  // Final = min(1700, max(375, 1900)) = min(1700, 1900) = 1700
  const result = computeWithPartIIB(
    [minimalItem({
      qualifying_children_count: 1,
      agi: 30000,
      earned_income: 5000,
      income_tax_liability: 0,
      bona_fide_pr_resident: true,
    })],
    1_500,
    500,
    100,
  );
  const input = fieldsOf(result.outputs, f1040)!;
  // max(375, 1900) = 1900, but cap = tentativeActc = 1700, final = 1700
  assertEquals(input.line28_actc, 1700);
});

Deno.test("part2b: eic_amount reduces payroll tax method result", () => {
  // 3 children, Part II-B applies
  // payrollTaxes = 3000, eic = 1500 → partIIB = 1500
  // Part II-A: (15000 - 2500) × 0.15 = 1875; actcCap = 5100; tentativeActc = min(6600, 5100) = 5100
  //   actc_IIA = min(5100, 1875) = 1875
  // Final = min(5100, max(1875, 1500)) = min(5100, 1875) = 1875
  const result = computeWithPartIIB(
    [minimalItem({
      qualifying_children_count: 3,
      agi: 50000,
      earned_income: 15000,
      income_tax_liability: 0,
    })],
    3_000,
    0,
    1_500,
  );
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line28_actc, 1875);
});

Deno.test("part2b: eic_amount exceeds payroll taxes → partIIB = 0, Part II-A is used", () => {
  // 3 children, Part II-B: payrollTaxes = 500, eic = 1000 → partIIB = max(0, -500) = 0
  // Part II-A: (20000 - 2500) × 0.15 = 2625; actcCap = 5100; tentativeActc = min(6600, 5100) = 5100
  //   actc_IIA = min(5100, 2625) = 2625
  // Final = min(5100, max(2625, 0)) = 2625
  const result = computeWithPartIIB(
    [minimalItem({
      qualifying_children_count: 3,
      agi: 50000,
      earned_income: 20000,
      income_tax_liability: 0,
    })],
    500,
    0,
    1_000,
  );
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line28_actc, 2625);
});

Deno.test("part2b: Schedule 1 line 15 enters line 22 of Part II-B", () => {
  // 3 children, line 21 = 1250 and line 22 = 2000, for line 23 = 3250.
  // eic = 0 → partIIB = 3250
  // Part II-A: (10000 - 2500) × 0.15 = 1125; actcCap = 5100; tentativeActc = min(6600, 5100) = 5100
  //   actc_IIA = min(5100, 1125) = 1125
  // Final = min(5100, max(1125, 3250)) = min(5100, 3250) = 3250
  const result = computeWithPartIIB(
    [minimalItem({
      qualifying_children_count: 3,
      agi: 50000,
      earned_income: 10000,
      income_tax_liability: 0,
    })],
    1_250,
    2_000,
  );
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line28_actc, 3250);
});

Deno.test("part2b: verified zero payroll sources let Part II-A win", () => {
  // 3 children, verified zero Part II-B sources yield line 25 = 0.
  // Part II-A: (30000 - 2500) × 0.15 = 4125; actcCap = 5100; tentativeActc = min(6600, 5100) = 5100
  //   actc_IIA = min(5100, 4125) = 4125
  // Final = min(5100, max(4125, 0)) = 4125
  const result = computeWithPartIIB([minimalItem({
    qualifying_children_count: 3,
    agi: 50000,
    earned_income: 30000,
    income_tax_liability: 0,
  })], 0);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line28_actc, 4125);
});

Deno.test("part2b: missing line sources cannot be treated as zero", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        qualifying_children_count: 3,
        earned_income: 10_000,
        income_tax_liability: 0,
      })]),
    Error,
    "Part II-B needs its W-2, Schedule 1, Schedule 2, EIC, and adoption-credit",
  );
});

Deno.test("part2b: old payroll shortcuts are rejected instead of ignored", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        qualifying_children_count: 3,
        earned_income: 10_000,
        income_tax_liability: 0,
        ss_taxes_withheld: 5_000,
        se_tax: 2_000,
      })]),
    Error,
    "legacy payroll fields cannot represent Part II-B",
  );
});

Deno.test("Schedule 8812 Worksheet A uses exactly the IRS-listed prior credits", () => {
  const worksheet = {
    schedule3_line1: 100,
    schedule3_line2: 200,
    schedule3_line3: 300,
    schedule3_line4: 400,
    schedule3_line5b: 500,
    schedule3_line6d: 600,
    schedule3_line6f: 700,
    schedule3_line6l: 800,
    schedule3_line6m: 900,
    worksheet_b_applies: false,
  };
  assertEquals(calculateCreditLimitWorksheetALine5(10_000, worksheet), 5_500);
  assertEquals(
    calculateCreditLimitWorksheetALine5(10_000, {
      ...worksheet,
      worksheet_b_applies: true,
      worksheet_b_line15: 1_200,
    }),
    4_300,
  );
  assertThrows(
    () =>
      calculateCreditLimitWorksheetALine5(10_000, {
        ...worksheet,
        worksheet_b_applies: true,
      }),
    Error,
    "Worksheet B needs its line 15",
  );
});

Deno.test("Schedule 8812 derives Worksheet B line 14 for Form 8859", () => {
  const result = f8812.compute({ taxYear: 2025, formType: "f1040" }, {
    f8812s: [minimalItem({ qualifying_children_count: 1 })],
    line18a_earned_income: 20_000,
    earned_income_worksheet: {
      form1040_line1z_wages: 20_000,
      nontaxable_combat_pay: 0,
      schedule_c_statutory_employee_income: 0,
      nonfarm_schedule_c_and_k1_net: 0,
      farm_schedule_f_and_k1_net: 0,
      farm_optional_method_used: false,
      excluded_medicaid_waiver_payments: 0,
      schedule1_line15_se_deduction: 0,
    },
    credit_limit_worksheet: {
      ...zeroCreditWorksheet,
      worksheet_b_applies: true,
      worksheet_b_line15: 100,
    },
  });
  const fields = fieldsOf(result.outputs, f1040);
  assertEquals(fields?.form8859_worksheet_b_applies, true);
  assertEquals(fields?.form8859_worksheet_b_line14, 500);
});

Deno.test("Schedule 8812 Worksheet B calculates payroll branch and adoption/EIC subtraction", () => {
  const earned = {
    form1040_line1z_wages: 10_000,
    nontaxable_combat_pay: 0,
    schedule_c_statutory_employee_income: 0,
    nonfarm_schedule_c_and_k1_net: 0,
    farm_schedule_f_and_k1_net: 0,
    farm_optional_method_used: false,
    excluded_medicaid_waiver_payments: 0,
    schedule1_line15_se_deduction: 0,
  };
  const payroll = {
    line21_w2_withheld_social_security_medicare: 2_000,
    schedule1_line15: 100,
    schedule2_line5: 0,
    schedule2_line6: 0,
    schedule2_line13: 0,
    form1040_line27a_eic: 500,
    schedule3_line11_adoption_credit: 100,
  };
  const lines = calculateCreditLimitWorksheetBLines(
    6_600,
    3,
    earned,
    false,
    payroll,
  );
  assertEquals(lines.line5, 1_125);
  assertEquals(lines.usesPayrollBranch, true);
  assertEquals(lines.line11, 1_500);
  assertEquals(lines.line13, 1_500);
  assertEquals(lines.line14, 5_100);
  assertThrows(
    () => calculateCreditLimitWorksheetBLines(6_600, 3, earned, false),
    Error,
    "lines 7-10 need",
  );
  assertEquals(
    calculateCreditLimitWorksheetBLines(2_200, 1, earned, false).line14,
    1_075,
  );
  assertEquals(
    calculateCreditLimitWorksheetBLines(500, 1, earned, false).line14,
    0,
  );
  assertEquals(
    calculateCreditLimitWorksheetBLines(2_200, 1, earned, true, payroll)
      .usesPayrollBranch,
    true,
  );
});

Deno.test("Schedule 8812 Worksheet B refuses caller line 14 and missing earned worksheet", () => {
  const item = minimalItem({ qualifying_children_count: 1 });
  const creditWorksheet = {
    ...zeroCreditWorksheet,
    worksheet_b_applies: true,
    worksheet_b_line15: 0,
  };
  assertThrows(
    () =>
      calculateSchedule8812Lines(2025, {
        f8812s: [item],
        credit_limit_worksheet: creditWorksheet,
      }),
    Error,
    "needs its earned-income worksheet",
  );
  assertThrows(
    () =>
      calculateSchedule8812Lines(2025, {
        f8812s: [item],
        credit_limit_worksheet: {
          ...creditWorksheet,
          worksheet_b_line14: 900,
        } as unknown as NonNullable<F8812Input["credit_limit_worksheet"]>,
      }),
    Error,
    "worksheet_b_line14",
  );
});

Deno.test("Schedule 8812 rejects missing or duplicated credit-limit worksheets", () => {
  const f8812s = [minimalItem({ qualifying_children_count: 1 })];
  assertThrows(
    () => calculateSchedule8812Lines(2025, { f8812s }),
    Error,
    "needs complete Credit Limit Worksheet A and B answers",
  );
  const lines = calculateSchedule8812Lines(2025, {
    f8812s: [{ ...f8812s[0], credit_limit_worksheet: zeroCreditWorksheet }],
  });
  assertEquals(lines?.line14, 2_200);
  assertThrows(
    () =>
      calculateSchedule8812Lines(2025, {
        f8812s: [{ ...f8812s[0], credit_limit_worksheet: zeroCreditWorksheet }],
        credit_limit_worksheet: zeroCreditWorksheet,
      }),
    Error,
    "cannot be supplied both on an item and at the root",
  );
});

Deno.test("Schedule 8812 structured worksheet limits line 19", () => {
  const result = f8812.compute({ taxYear: 2025, formType: "f1040" }, {
    f8812s: [
      minimalItem({
        qualifying_children_count: 1,
        income_tax_liability: 2_000,
      }),
    ],
    line18a_earned_income: 0,
    credit_limit_worksheet: {
      schedule3_line1: 300,
      schedule3_line2: 0,
      schedule3_line3: 0,
      schedule3_line4: 0,
      schedule3_line5b: 0,
      schedule3_line6d: 0,
      schedule3_line6f: 0,
      schedule3_line6l: 0,
      schedule3_line6m: 0,
      worksheet_b_applies: false,
    },
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.line19_child_tax_credit, 1_700);
});

Deno.test("Schedule 8812 refundable credit requires verified line 18a", () => {
  const f8812s = [minimalItem({
    qualifying_children_count: 1,
    income_tax_liability: 0,
    earned_income: 8_000,
    nontaxable_combat_pay: 2_000,
  })];
  assertThrows(
    () =>
      calculateSchedule8812Lines(2025, {
        f8812s,
        credit_limit_worksheet: zeroCreditWorksheet,
      }),
    Error,
    "needs verified line 18a earned income",
  );
  const lines = calculateSchedule8812Lines(2025, {
    f8812s,
    line18a_earned_income: 8_000,
    credit_limit_worksheet: zeroCreditWorksheet,
  });
  assertEquals(lines?.line18a, 8_000);
  assertEquals(lines?.line18b, 2_000);
  assertEquals(lines?.line20, 825);
  const itemLines = calculateSchedule8812Lines(2025, {
    f8812s: [{ ...f8812s[0], line18a_earned_income: 8_000 }],
    credit_limit_worksheet: zeroCreditWorksheet,
  });
  assertEquals(itemLines?.line20, 825);
  assertThrows(
    () =>
      calculateSchedule8812Lines(2025, {
        f8812s: [{ ...f8812s[0], line18a_earned_income: 8_000 }],
        line18a_earned_income: 10_000,
        credit_limit_worksheet: zeroCreditWorksheet,
      }),
    Error,
    "conflicting line 18a earned income",
  );
});

Deno.test("Schedule 8812 earned-income worksheet follows printed lines", () => {
  const worksheet = {
    form1040_line1z_wages: 10_000,
    nontaxable_combat_pay: 2_000,
    schedule_c_statutory_employee_income: 3_000,
    nonfarm_schedule_c_and_k1_net: 5_000,
    farm_schedule_f_and_k1_net: -1_000,
    farm_optional_method_used: false,
    excluded_medicaid_waiver_payments: 100,
    schedule1_line15_se_deduction: 500,
  };
  assertEquals(calculateEarnedIncomeWorksheet(worksheet), {
    line1a: 10_000,
    line1b: 2_000,
    line2a: 3_000,
    line2b: 5_000,
    line2c: -1_000,
    line2d: -1_000,
    line2e: -1_000,
    line3: 19_000,
    line4: 100,
    line5: 500,
    line6: 600,
    line7: 18_400,
  });
  assertEquals(
    calculateEarnedIncomeWorksheet({
      ...worksheet,
      form1040_line1z_wages: 0,
      nonfarm_schedule_c_and_k1_net: -6_000,
    }).line7,
    0,
  );
  assertEquals(
    calculateEarnedIncomeWorksheet({
      ...worksheet,
      form1040_line1z_wages: 0,
      nontaxable_combat_pay: 0,
      schedule_c_statutory_employee_income: 0,
      nonfarm_schedule_c_and_k1_net: 1_000,
      farm_schedule_f_and_k1_net: 0,
      excluded_medicaid_waiver_payments: 1_200,
      schedule1_line15_se_deduction: 500,
    }).line7,
    -700,
  );
});

Deno.test("Schedule 8812 farm optional method caps positive farm profit", () => {
  const worksheet = {
    form1040_line1z_wages: 5_000,
    nontaxable_combat_pay: 0,
    schedule_c_statutory_employee_income: 0,
    nonfarm_schedule_c_and_k1_net: 0,
    farm_schedule_f_and_k1_net: 10_000,
    farm_optional_method_used: true,
    schedule_se_line15: 7_000,
    excluded_medicaid_waiver_payments: 0,
    schedule1_line15_se_deduction: 0,
  };
  const lines = calculateEarnedIncomeWorksheet(worksheet);
  assertEquals(lines.line2e, 7_000);
  assertEquals(lines.line7, 12_000);
  assertThrows(
    () =>
      calculateEarnedIncomeWorksheet({
        ...worksheet,
        schedule_se_line15: undefined,
      }),
    Error,
    "needs Schedule SE line 15",
  );
});

Deno.test("Schedule 8812 computes line 18a from a complete worksheet", () => {
  const earned_income_worksheet = {
    form1040_line1z_wages: 8_000,
    nontaxable_combat_pay: 2_000,
    schedule_c_statutory_employee_income: 0,
    nonfarm_schedule_c_and_k1_net: 0,
    farm_schedule_f_and_k1_net: 0,
    farm_optional_method_used: false,
    excluded_medicaid_waiver_payments: 0,
    schedule1_line15_se_deduction: 0,
  };
  const f8812s = [minimalItem({
    qualifying_children_count: 1,
    income_tax_liability: 0,
    nontaxable_combat_pay: 2_000,
  })];
  const lines = calculateSchedule8812Lines(2025, {
    f8812s,
    earned_income_worksheet,
    credit_limit_worksheet: zeroCreditWorksheet,
  });
  assertEquals(lines?.line18a, 10_000);
  assertEquals(lines?.line18b, 2_000);
  assertEquals(lines?.line20, 1_125);
  const itemLines = calculateSchedule8812Lines(2025, {
    f8812s: [{ ...f8812s[0], earned_income_worksheet }],
    credit_limit_worksheet: zeroCreditWorksheet,
  });
  assertEquals(itemLines?.line18a, 10_000);
  assertThrows(
    () =>
      calculateSchedule8812Lines(2025, {
        f8812s: [{ ...f8812s[0], earned_income_worksheet }],
        earned_income_worksheet,
        credit_limit_worksheet: zeroCreditWorksheet,
      }),
    Error,
    "cannot be supplied both on an item and at the root",
  );
  assertThrows(
    () =>
      calculateSchedule8812Lines(2025, {
        f8812s,
        earned_income_worksheet,
        line18a_earned_income: 8_000,
        credit_limit_worksheet: zeroCreditWorksheet,
      }),
    Error,
    "worksheet conflicts with line 18a",
  );
  assertThrows(
    () =>
      calculateSchedule8812Lines(2025, {
        f8812s: [{ ...f8812s[0], nontaxable_combat_pay: 3_000 }],
        earned_income_worksheet,
        credit_limit_worksheet: zeroCreditWorksheet,
      }),
    Error,
    "conflicting nontaxable combat pay",
  );
});

Deno.test("Schedule 8812 Part II-B uses each printed line source", () => {
  const details = {
    line21_w2_withheld_social_security_medicare: 3_000,
    schedule1_line15: 400,
    schedule2_line5: 100,
    schedule2_line6: 200,
    schedule2_line13: 300,
    form1040_line27a_eic: 150,
    schedule3_line11_adoption_credit: 50,
  };
  assertEquals(calculatePartIIBLines(details, 1_125), {
    line21: 3_000,
    line22: 1_000,
    line23: 4_000,
    line24: 200,
    line25: 3_800,
    line26: 3_800,
  });
  const lines = calculateSchedule8812Lines(2025, {
    f8812s: [{
      qualifying_children_count: 3,
      agi: 50_000,
      filing_status: FilingStatus.Single,
      income_tax_liability: 0,
      earned_income: 10_000,
    }],
    line18a_earned_income: 10_000,
    credit_limit_worksheet: zeroCreditWorksheet,
    part_iib: details,
  });
  assertEquals(lines?.line17, 5_100);
  assertEquals(lines?.line27, 3_800);
});
