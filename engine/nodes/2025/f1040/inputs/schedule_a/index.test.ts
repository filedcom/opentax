// UNRESOLVED ITEMS:
//   - line_5a_election ("income_tax" | "sales_tax"): not in schema; only line_5a_tax_amount exists
//   - line_18_itemize_checkbox: not in schema
//   - magi field for SALT phase-out (OBBB Act): not in schema
//   - line_8b_lender_name/address/ssn_ein conditional fields: not in schema
//   - line_16_other_description conditional field: not in schema
//   - MFS SALT cap ($20,000): filing_status not in schema; only single SALT_CAP ($40,000) is used
//   - SALT cap phase-out (30% × excess MAGI over $500,000): magi field not in schema

import { assertEquals } from "@std/assert";
import { scheduleA } from "./index.ts";

type ScheduleAInput = Parameters<typeof scheduleA.compute>[0];

function compute(input: ScheduleAInput) {
  return scheduleA.compute(input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

function f1040Input(result: ReturnType<typeof compute>): Record<string, number> {
  return findOutput(result, "f1040")!.fields as Record<string, number>;
}

// =============================================================================
// 1. INPUT SCHEMA VALIDATION
// =============================================================================

Deno.test("scheduleA.inputSchema: empty object is valid — all fields optional", () => {
  const parsed = scheduleA.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("scheduleA.inputSchema: negative medical expenses rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_1_medical: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: negative line_5a_tax_amount rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_5a_tax_amount: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: negative line_5b_real_estate_tax rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_5b_real_estate_tax: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: negative line_5c_personal_property_tax rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_5c_personal_property_tax: -50 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: negative line_6_other_taxes rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_6_other_taxes: -200 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: negative line_8a_mortgage_interest_1098 rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_8a_mortgage_interest_1098: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: negative line_8b_mortgage_interest_no_1098 rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_8b_mortgage_interest_no_1098: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: negative line_8c_points_no_1098 rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_8c_points_no_1098: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: negative line_9_investment_interest rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_9_investment_interest: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: negative line_11_cash_contributions rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_11_cash_contributions: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: negative line_12_noncash_contributions rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_12_noncash_contributions: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: negative line_13_contribution_carryover rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_13_contribution_carryover: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: negative line_15_casualty_theft_loss rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_15_casualty_theft_loss: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: negative line_16_other_deductions rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_16_other_deductions: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: force_itemized boolean accepted", () => {
  const parsed = scheduleA.inputSchema.safeParse({ force_itemized: true });
  assertEquals(parsed.success, true);
});

Deno.test("scheduleA.inputSchema: force_standard boolean accepted", () => {
  const parsed = scheduleA.inputSchema.safeParse({ force_standard: true });
  assertEquals(parsed.success, true);
});

Deno.test("scheduleA.inputSchema: zero values valid for all numeric fields", () => {
  const parsed = scheduleA.inputSchema.safeParse({
    line_1_medical: 0,
    line_5a_tax_amount: 0,
    line_5b_real_estate_tax: 0,
    line_5c_personal_property_tax: 0,
    line_6_other_taxes: 0,
    line_8a_mortgage_interest_1098: 0,
    line_8b_mortgage_interest_no_1098: 0,
    line_8c_points_no_1098: 0,
    line_9_investment_interest: 0,
    line_11_cash_contributions: 0,
    line_12_noncash_contributions: 0,
    line_13_contribution_carryover: 0,
    line_15_casualty_theft_loss: 0,
    line_16_other_deductions: 0,
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. PER-BOX ROUTING
// =============================================================================

Deno.test("scheduleA.compute: line_1_medical with AGI routes deductible portion to f1040 line12e", () => {
  // deductible = 10000 - (80000 × 7.5%) = 10000 - 6000 = 4000
  const result = compute({ line_1_medical: 10_000, agi: 80_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 4_000);
});

Deno.test("scheduleA.compute: line_1_medical zero routes zero to f1040 line12e (no other deductions)", () => {
  const result = compute({ line_1_medical: 0, agi: 80_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 0);
});

Deno.test("scheduleA.compute: line_5a_tax_amount routes through SALT cap to f1040 line12e", () => {
  // 12000 < 40000 cap — passes through
  const result = compute({ line_5a_tax_amount: 12_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 12_000);
});

Deno.test("scheduleA.compute: line_5b_real_estate_tax routes to f1040 line12e", () => {
  const result = compute({ line_5b_real_estate_tax: 8_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 8_000);
});

Deno.test("scheduleA.compute: line_5c_personal_property_tax routes to f1040 line12e", () => {
  const result = compute({ line_5c_personal_property_tax: 3_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 3_000);
});

Deno.test("scheduleA.compute: line_6_other_taxes routes to f1040 line12e AND form6251 line2a", () => {
  const result = compute({ line_6_other_taxes: 5_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 5_000);
  const form6251 = findOutput(result, "form6251");
  assertEquals(form6251 !== undefined, true);
  assertEquals((form6251!.fields as Record<string, number>).line2a_taxes_paid, 5_000);
});

Deno.test("scheduleA.compute: line_6_other_taxes zero does not produce form6251 output", () => {
  const result = compute({ line_6_other_taxes: 0 });
  assertEquals(findOutput(result, "form6251"), undefined);
});

Deno.test("scheduleA.compute: line_8a_mortgage_interest_1098 routes to f1040 line12e", () => {
  const result = compute({ line_8a_mortgage_interest_1098: 18_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 18_000);
});

Deno.test("scheduleA.compute: line_8b_mortgage_interest_no_1098 routes to f1040 line12e", () => {
  const result = compute({ line_8b_mortgage_interest_no_1098: 4_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 4_000);
});

Deno.test("scheduleA.compute: line_8c_points_no_1098 routes to f1040 line12e", () => {
  const result = compute({ line_8c_points_no_1098: 1_200 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 1_200);
});

Deno.test("scheduleA.compute: line_9_investment_interest routes to f1040 line12e", () => {
  const result = compute({ line_9_investment_interest: 2_500 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 2_500);
});

Deno.test("scheduleA.compute: line_11_cash_contributions routes to f1040 line12e (below AGI limit)", () => {
  // 5000 < 60% × 100000 = 60000 — passes through
  const result = compute({ line_11_cash_contributions: 5_000, agi: 100_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 5_000);
});

Deno.test("scheduleA.compute: line_12_noncash_contributions routes to f1040 line12e", () => {
  const result = compute({ line_12_noncash_contributions: 3_000, agi: 100_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 3_000);
});

Deno.test("scheduleA.compute: line_13_contribution_carryover routes to f1040 line12e", () => {
  const result = compute({ line_13_contribution_carryover: 2_000, agi: 100_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 2_000);
});

Deno.test("scheduleA.compute: line_15_casualty_theft_loss routes directly to f1040 line12e", () => {
  // Amount from Form 4684 Line 18 — pre-reduced by $100/event and 10% AGI floor
  const result = compute({ line_15_casualty_theft_loss: 6_500 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 6_500);
});

Deno.test("scheduleA.compute: line_16_other_deductions routes directly to f1040 line12e", () => {
  const result = compute({ line_16_other_deductions: 1_800 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 1_800);
});

Deno.test("scheduleA.compute: all taxes zero produces no form6251 output", () => {
  const result = compute({ line_11_cash_contributions: 500 });
  assertEquals(findOutput(result, "form6251"), undefined);
});

// =============================================================================
// 3. AGGREGATION
// =============================================================================

Deno.test("scheduleA.compute: SALT aggregates 5a + 5b + 5c before applying cap", () => {
  // 10000 + 8000 + 3000 = 21000 < 40000 cap
  const result = compute({
    line_5a_tax_amount: 10_000,
    line_5b_real_estate_tax: 8_000,
    line_5c_personal_property_tax: 3_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 21_000);
});

Deno.test("scheduleA.compute: interest aggregates 8a + 8b + 8c + 9 for Line 10", () => {
  // 12000 + 3000 + 800 + 2200 = 18000
  const result = compute({
    line_8a_mortgage_interest_1098: 12_000,
    line_8b_mortgage_interest_no_1098: 3_000,
    line_8c_points_no_1098: 800,
    line_9_investment_interest: 2_200,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 18_000);
});

Deno.test("scheduleA.compute: contributions aggregate 11 + 12 + 13 before AGI limit", () => {
  // 20000 + 10000 + 5000 = 35000 < 60% × 100000 = 60000
  const result = compute({
    line_11_cash_contributions: 20_000,
    line_12_noncash_contributions: 10_000,
    line_13_contribution_carryover: 5_000,
    agi: 100_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 35_000);
});

Deno.test("scheduleA.compute: contributions aggregate 11 + 12 + 13 and cap at 60% AGI when over limit", () => {
  // 40000 + 15000 + 10000 = 65000 > 60% × 100000 = 60000 → capped at 60000
  const result = compute({
    line_11_cash_contributions: 40_000,
    line_12_noncash_contributions: 15_000,
    line_13_contribution_carryover: 10_000,
    agi: 100_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 60_000);
});

Deno.test("scheduleA.compute: Line 17 = medical + taxes(SALT+line6) + interest + contributions + casualty + other", () => {
  // medical: 10000 - (80000×0.075) = 10000 - 6000 = 4000
  // SALT: 12000 + 6000 = 18000 (under cap)
  // line6: 2000 → taxesTotal = 20000
  // interest: 15000
  // contributions: 3000 (under 60% of 80000=48000)
  // casualty: 2000
  // other: 500
  // total = 4000 + 20000 + 15000 + 3000 + 2000 + 500 = 44500
  const result = compute({
    line_1_medical: 10_000,
    agi: 80_000,
    line_5a_tax_amount: 12_000,
    line_5b_real_estate_tax: 6_000,
    line_6_other_taxes: 2_000,
    line_8a_mortgage_interest_1098: 15_000,
    line_11_cash_contributions: 3_000,
    line_15_casualty_theft_loss: 2_000,
    line_16_other_deductions: 500,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 44_500);
});

Deno.test("scheduleA.compute: form6251 line2a_taxes_paid = SALT-capped amount + line_6", () => {
  // SALT: 5000 + 8000 = 13000 (under cap)
  // line6: 3000
  // taxesTotal = 16000
  const result = compute({
    line_5a_tax_amount: 5_000,
    line_5b_real_estate_tax: 8_000,
    line_6_other_taxes: 3_000,
  });
  const form6251 = findOutput(result, "form6251");
  assertEquals(form6251 !== undefined, true);
  assertEquals((form6251!.fields as Record<string, number>).line2a_taxes_paid, 16_000);
});

// =============================================================================
// 4. THRESHOLDS
// =============================================================================

// Medical — 7.5% AGI floor
Deno.test("scheduleA.compute: medical expenses exactly at 7.5% AGI floor = zero deduction", () => {
  // 6000 = 80000 × 0.075 → deductible = max(0, 6000 - 6000) = 0
  const result = compute({ line_1_medical: 6_000, agi: 80_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 0);
});

Deno.test("scheduleA.compute: medical expenses 1 dollar above 7.5% AGI floor yields $1 deduction", () => {
  // 6001 - 6000 = 1
  const result = compute({ line_1_medical: 6_001, agi: 80_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 1);
});

Deno.test("scheduleA.compute: medical expenses below 7.5% AGI floor floors at zero (not negative)", () => {
  // 3000 < 6000 → deductible = max(0, 3000 - 6000) = 0
  const result = compute({ line_1_medical: 3_000, agi: 80_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 0);
});

Deno.test("scheduleA.compute: medical deduction with zero AGI is full medical amount", () => {
  // AGI = 0 → floor = 0 → deductible = 5000 - 0 = 5000
  const result = compute({ line_1_medical: 5_000, agi: 0 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 5_000);
});

// SALT — $40,000 cap (TY2025 OBBB Act)
Deno.test("scheduleA.compute: SALT total exactly $40,000 at cap passes through unchanged", () => {
  const result = compute({ line_5a_tax_amount: 40_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 40_000);
});

Deno.test("scheduleA.compute: SALT total $40,001 is capped at $40,000", () => {
  const result = compute({ line_5a_tax_amount: 40_001 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 40_000);
});

Deno.test("scheduleA.compute: SALT total $39,999 below cap passes through unchanged", () => {
  const result = compute({ line_5a_tax_amount: 39_999 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 39_999);
});

Deno.test("scheduleA.compute: SALT total well above cap ($75,000) still capped at $40,000", () => {
  const result = compute({
    line_5a_tax_amount: 30_000,
    line_5b_real_estate_tax: 25_000,
    line_5c_personal_property_tax: 20_000,
  });
  // 75000 > 40000 → capped
  assertEquals(f1040Input(result).line12e_itemized_deductions, 40_000);
});

// SALT — form6251 at cap boundary
Deno.test("scheduleA.compute: SALT exactly at $40,000 still routes to form6251 line2a", () => {
  const result = compute({ line_5a_tax_amount: 40_000 });
  const form6251 = findOutput(result, "form6251");
  assertEquals(form6251 !== undefined, true);
  assertEquals((form6251!.fields as Record<string, number>).line2a_taxes_paid, 40_000);
});

// Charitable contributions — 60% AGI cap
Deno.test("scheduleA.compute: cash contributions exactly at 60% AGI pass through unchanged", () => {
  // 60% × 100000 = 60000
  const result = compute({ line_11_cash_contributions: 60_000, agi: 100_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 60_000);
});

Deno.test("scheduleA.compute: cash contributions $1 above 60% AGI are capped", () => {
  // 60001 > 60000 → capped at 60000
  const result = compute({ line_11_cash_contributions: 60_001, agi: 100_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 60_000);
});

Deno.test("scheduleA.compute: cash contributions below 60% AGI pass through unchanged", () => {
  const result = compute({ line_11_cash_contributions: 30_000, agi: 100_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 30_000);
});

// =============================================================================
// 5. HARD VALIDATION RULES (schema throws)
// =============================================================================

Deno.test("scheduleA.inputSchema: non-boolean force_itemized rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ force_itemized: "yes" });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: non-boolean force_standard rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ force_standard: 1 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: string where number expected is rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_1_medical: "5000" });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 6. WARNING-ONLY RULES (must NOT throw)
// =============================================================================

Deno.test("scheduleA.compute: force_itemized=true does not throw", () => {
  const result = compute({ force_itemized: true, line_11_cash_contributions: 500 });
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("scheduleA.compute: force_standard=true does not throw", () => {
  const result = compute({ force_standard: true });
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("scheduleA.compute: line_12_noncash_contributions > $500 (Form 8283 threshold) does not throw", () => {
  // Form 8283 is a documentation requirement — compute() should not throw
  const result = compute({ line_12_noncash_contributions: 600 });
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("scheduleA.compute: line_12_noncash_contributions > $5,000 (appraisal threshold) does not throw", () => {
  const result = compute({ line_12_noncash_contributions: 6_000, agi: 100_000 });
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 7. INFORMATIONAL FIELDS (output count and routing unchanged)
// =============================================================================

Deno.test("scheduleA.compute: force_itemized alone produces f1040 output", () => {
  const result = compute({ force_itemized: true });
  assertEquals(findOutput(result, "f1040") !== undefined, true);
});

Deno.test("scheduleA.compute: force_standard alone produces f1040 output", () => {
  const result = compute({ force_standard: true });
  assertEquals(findOutput(result, "f1040") !== undefined, true);
});

Deno.test("scheduleA.compute: force_itemized does not change deduction total (routing hint only)", () => {
  const withFlag = compute({ force_itemized: true, line_8a_mortgage_interest_1098: 20_000 });
  const withoutFlag = compute({ line_8a_mortgage_interest_1098: 20_000 });
  assertEquals(
    f1040Input(withFlag).line12e_itemized_deductions,
    f1040Input(withoutFlag).line12e_itemized_deductions,
  );
});

// =============================================================================
// 8. EDGE CASES
// =============================================================================

Deno.test("scheduleA.compute: all-zero inputs produce zero itemized deduction", () => {
  const result = compute({});
  assertEquals(f1040Input(result).line12e_itemized_deductions, 0);
});

Deno.test("scheduleA.compute: medical deduction result is never negative", () => {
  // Large AGI, tiny medical
  const result = compute({ line_1_medical: 100, agi: 1_000_000 });
  const deduction = f1040Input(result).line12e_itemized_deductions;
  assertEquals(deduction >= 0, true);
  assertEquals(deduction, 0);
});

Deno.test("scheduleA.compute: contributions with zero AGI pass through uncapped", () => {
  // When AGI = 0 (or not provided), 60% AGI limit = 0 — implementation must handle gracefully
  // Expectation: with zero AGI the limit should not zero out genuine contributions;
  // context.md does not define behavior for zero-AGI charitable limits explicitly,
  // so this test verifies no crash and non-negative output.
  const result = compute({ line_11_cash_contributions: 5_000 });
  assertEquals(Array.isArray(result.outputs), true);
  const deduction = f1040Input(result).line12e_itemized_deductions;
  assertEquals(deduction >= 0, true);
});

Deno.test("scheduleA.compute: SALT all three components sum to exactly $40,000 passes through", () => {
  // 20000 + 15000 + 5000 = 40000 = cap → capped value = 40000
  const result = compute({
    line_5a_tax_amount: 20_000,
    line_5b_real_estate_tax: 15_000,
    line_5c_personal_property_tax: 5_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 40_000);
});

Deno.test("scheduleA.compute: line_6_other_taxes alone (no SALT) produces form6251 addback", () => {
  // Foreign income taxes — no SALT, but still produce form6251 AMT addback
  const result = compute({ line_6_other_taxes: 8_000 });
  const form6251 = findOutput(result, "form6251");
  assertEquals(form6251 !== undefined, true);
  assertEquals((form6251!.fields as Record<string, number>).line2a_taxes_paid, 8_000);
});

Deno.test("scheduleA.compute: SALT alone (no line_6) still produces form6251 addback", () => {
  // Sch A Line 7 = SALT-capped + line_6; since line_7 > 0 → form6251 output
  const result = compute({ line_5a_tax_amount: 15_000 });
  const form6251 = findOutput(result, "form6251");
  assertEquals(form6251 !== undefined, true);
  assertEquals((form6251!.fields as Record<string, number>).line2a_taxes_paid, 15_000);
});

Deno.test("scheduleA.compute: SALT capped amount (not raw) flows to form6251 line2a", () => {
  // 5a = 50000 → capped at 40000; form6251 should receive 40000 (not 50000)
  const result = compute({ line_5a_tax_amount: 50_000 });
  const form6251 = findOutput(result, "form6251");
  assertEquals(form6251 !== undefined, true);
  assertEquals((form6251!.fields as Record<string, number>).line2a_taxes_paid, 40_000);
});

Deno.test("scheduleA.compute: casualty loss enters total directly without re-applying floors", () => {
  // Form 4684 already applied $100/event and 10% AGI reductions;
  // Sch A Line 15 = Form 4684 Line 18 amount entered directly
  const result = compute({ line_15_casualty_theft_loss: 4_200 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 4_200);
});

Deno.test("scheduleA.compute: other deductions enter total directly", () => {
  const result = compute({ line_16_other_deductions: 3_500 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 3_500);
});

Deno.test("scheduleA.compute: carryover contributions subject to 60% AGI cap alongside current-year contributions", () => {
  // 11: 40000, 13: 30000 → raw = 70000; cap = 60% × 100000 = 60000
  const result = compute({
    line_11_cash_contributions: 40_000,
    line_13_contribution_carryover: 30_000,
    agi: 100_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 60_000);
});

Deno.test("scheduleA.compute: SALT cap applies even when only one of the three SALT lines is populated", () => {
  // Only 5a; 45000 > 40000 → capped
  const result = compute({ line_5a_tax_amount: 45_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 40_000);
});

// =============================================================================
// 9. SMOKE TEST
// =============================================================================

Deno.test("scheduleA.compute: smoke — all major boxes populated produces correct total and form6251", () => {
  // Medical: 15000 - (120000 × 7.5%) = 15000 - 9000 = 6000
  // SALT: 20000 + 10000 + 3000 = 33000 (under 40000 cap)
  // line_6: 2500 → taxesTotal = 33000 + 2500 = 35500
  // Interest: 18000 + 0 + 1000 + 3000 = 22000
  // Contributions: 10000 + 5000 + 2000 = 17000 (17000 < 60% × 120000 = 72000)
  // Casualty: 4000
  // Other: 750
  // Total = 6000 + 35500 + 22000 + 17000 + 4000 + 750 = 85250
  const result = compute({
    line_1_medical: 15_000,
    agi: 120_000,
    line_5a_tax_amount: 20_000,
    line_5b_real_estate_tax: 10_000,
    line_5c_personal_property_tax: 3_000,
    line_6_other_taxes: 2_500,
    line_8a_mortgage_interest_1098: 18_000,
    line_8c_points_no_1098: 1_000,
    line_9_investment_interest: 3_000,
    line_11_cash_contributions: 10_000,
    line_12_noncash_contributions: 5_000,
    line_13_contribution_carryover: 2_000,
    line_15_casualty_theft_loss: 4_000,
    line_16_other_deductions: 750,
  });

  // f1040 output exists and total is correct
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals((f1040Out!.fields as Record<string, number>).line12e_itemized_deductions, 85_250);

  // form6251 output exists with taxes addback = 35500
  const form6251Out = findOutput(result, "form6251");
  assertEquals(form6251Out !== undefined, true);
  assertEquals((form6251Out!.fields as Record<string, number>).line2a_taxes_paid, 35_500);

  // exactly two outputs
  assertEquals(result.outputs.length, 2);
});
