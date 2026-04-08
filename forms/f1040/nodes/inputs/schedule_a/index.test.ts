// UNRESOLVED ITEMS:
//   - line_5a_election ("income_tax" | "sales_tax"): not in schema; only line_5a_tax_amount exists
//   - line_18_itemize_checkbox: not in schema

import { assertEquals } from "@std/assert";
import { scheduleA } from "./index.ts";
import { FilingStatus } from "../../types.ts";

type ScheduleAInput = Parameters<typeof scheduleA.compute>[1];

function compute(input: ScheduleAInput) {
  return scheduleA.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

function f1040Input(result: ReturnType<typeof compute>): Record<string, number> {
  return findOutput(result, "f1040")!.fields as Record<string, number>;
}

// =============================================================================
// 1. INPUT SCHEMA VALIDATION — one representative check per rule
// =============================================================================

Deno.test("scheduleA.inputSchema: empty object is valid — all fields optional", () => {
  const parsed = scheduleA.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("scheduleA.inputSchema: negative numeric field rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_1_medical: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: non-boolean force_itemized rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ force_itemized: "yes" });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: string where number expected is rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_1_medical: "5000" });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. MEDICAL EXPENSES — 7.5% AGI floor
// =============================================================================

Deno.test("scheduleA.compute: medical deduction = expenses minus 7.5% AGI floor", () => {
  // 10000 - (80000 × 7.5%) = 10000 - 6000 = 4000
  const result = compute({ line_1_medical: 10_000, agi: 80_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 4_000);
});

Deno.test("scheduleA.compute: medical expenses exactly at 7.5% AGI floor = zero deduction", () => {
  // 6000 = 80000 × 0.075 → deductible = max(0, 0) = 0
  const result = compute({ line_1_medical: 6_000, agi: 80_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 0);
});

Deno.test("scheduleA.compute: medical expenses $1 above 7.5% AGI floor yields $1 deduction", () => {
  // 6001 - 6000 = 1
  const result = compute({ line_1_medical: 6_001, agi: 80_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 1);
});

Deno.test("scheduleA.compute: medical expenses below 7.5% AGI floor floors at zero, never negative", () => {
  // 3000 < 6000 → deductible = max(0, 3000 - 6000) = 0
  const result = compute({ line_1_medical: 3_000, agi: 80_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 0);
});

Deno.test("scheduleA.compute: medical deduction with zero AGI equals full medical amount", () => {
  // floor = 0 × 7.5% = 0 → deductible = 5000
  const result = compute({ line_1_medical: 5_000, agi: 0 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 5_000);
});

// =============================================================================
// 3. SALT CAP — $40,000 (TY2025 OBBBA)
// =============================================================================

Deno.test("scheduleA.compute: SALT below $40,000 cap passes through unchanged", () => {
  const result = compute({ line_5a_tax_amount: 39_999 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 39_999);
});

Deno.test("scheduleA.compute: SALT exactly $40,000 passes through unchanged", () => {
  const result = compute({ line_5a_tax_amount: 40_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 40_000);
});

Deno.test("scheduleA.compute: SALT $40,001 is capped at $40,000", () => {
  const result = compute({ line_5a_tax_amount: 40_001 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 40_000);
});

Deno.test("scheduleA.compute: SALT three components aggregate then cap — 5a+5b+5c well above cap", () => {
  // 30000 + 25000 + 20000 = 75000 → capped at 40000
  const result = compute({
    line_5a_tax_amount: 30_000,
    line_5b_real_estate_tax: 25_000,
    line_5c_personal_property_tax: 20_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 40_000);
});

Deno.test("scheduleA.compute: SALT three components sum to exactly $40,000 passes through", () => {
  // 20000 + 15000 + 5000 = 40000 = cap
  const result = compute({
    line_5a_tax_amount: 20_000,
    line_5b_real_estate_tax: 15_000,
    line_5c_personal_property_tax: 5_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 40_000);
});

Deno.test("scheduleA.compute: SALT aggregates 5a + 5b + 5c before applying cap (below cap)", () => {
  // 10000 + 8000 + 3000 = 21000 < 40000 cap
  const result = compute({
    line_5a_tax_amount: 10_000,
    line_5b_real_estate_tax: 8_000,
    line_5c_personal_property_tax: 3_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 21_000);
});

// =============================================================================
// 4. AMT ADDBACK — form6251 line2a_taxes_paid
// =============================================================================

Deno.test("scheduleA.compute: SALT alone routes capped amount to form6251 line2a", () => {
  const result = compute({ line_5a_tax_amount: 15_000 });
  const form6251 = findOutput(result, "form6251");
  assertEquals(form6251 !== undefined, true);
  assertEquals((form6251!.fields as Record<string, number>).line2a_taxes_paid, 15_000);
});

Deno.test("scheduleA.compute: SALT capped amount (not raw) flows to form6251 line2a", () => {
  // 5a = 50000 → capped at 40000; form6251 receives 40000
  const result = compute({ line_5a_tax_amount: 50_000 });
  const form6251 = findOutput(result, "form6251");
  assertEquals(form6251 !== undefined, true);
  assertEquals((form6251!.fields as Record<string, number>).line2a_taxes_paid, 40_000);
});

Deno.test("scheduleA.compute: taxesTotal (SALT + line_6) flows to form6251 line2a", () => {
  // SALT: 5000 + 8000 = 13000; line6: 3000 → taxesTotal = 16000
  const result = compute({
    line_5a_tax_amount: 5_000,
    line_5b_real_estate_tax: 8_000,
    line_6_other_taxes: 3_000,
  });
  const form6251 = findOutput(result, "form6251");
  assertEquals(form6251 !== undefined, true);
  assertEquals((form6251!.fields as Record<string, number>).line2a_taxes_paid, 16_000);
});

Deno.test("scheduleA.compute: line_6_other_taxes alone produces form6251 addback", () => {
  const result = compute({ line_6_other_taxes: 8_000 });
  const form6251 = findOutput(result, "form6251");
  assertEquals(form6251 !== undefined, true);
  assertEquals((form6251!.fields as Record<string, number>).line2a_taxes_paid, 8_000);
});

Deno.test("scheduleA.compute: zero taxes total does not produce form6251 output", () => {
  const result = compute({ line_11_cash_contributions: 500 });
  assertEquals(findOutput(result, "form6251"), undefined);
});

// =============================================================================
// 5. MORTGAGE INTEREST — passthrough
// =============================================================================

Deno.test("scheduleA.compute: mortgage interest from 1098 routes to f1040 line12e", () => {
  const result = compute({ line_8a_mortgage_interest_1098: 18_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 18_000);
});

Deno.test("scheduleA.compute: interest aggregates all four interest lines", () => {
  // 12000 + 3000 + 800 + 2200 = 18000
  const result = compute({
    line_8a_mortgage_interest_1098: 12_000,
    line_8b_mortgage_interest_no_1098: 3_000,
    line_8c_points_no_1098: 800,
    line_9_investment_interest: 2_200,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 18_000);
});

// =============================================================================
// 6. CHARITABLE CONTRIBUTIONS — 60% AGI cap
// =============================================================================

Deno.test("scheduleA.compute: cash contributions below 60% AGI cap pass through unchanged", () => {
  // 5000 < 60% × 100000 = 60000
  const result = compute({ line_11_cash_contributions: 5_000, agi: 100_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 5_000);
});

Deno.test("scheduleA.compute: cash contributions exactly at 60% AGI cap pass through unchanged", () => {
  // 60% × 100000 = 60000
  const result = compute({ line_11_cash_contributions: 60_000, agi: 100_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 60_000);
});

Deno.test("scheduleA.compute: cash contributions $1 above 60% AGI cap are capped at 60% AGI", () => {
  // 60001 > 60000 → capped at 60000
  const result = compute({ line_11_cash_contributions: 60_001, agi: 100_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 60_000);
});

Deno.test("scheduleA.compute: contributions aggregate 11 + 12 + 13 before 60% AGI cap (below cap)", () => {
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
  // 40000 + 15000 + 10000 = 65000 > 60% × 100000 = 60000 → capped
  const result = compute({
    line_11_cash_contributions: 40_000,
    line_12_noncash_contributions: 15_000,
    line_13_contribution_carryover: 10_000,
    agi: 100_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 60_000);
});

Deno.test("scheduleA.compute: carryover + current-year contributions subject to same 60% AGI cap", () => {
  // 40000 + 30000 = 70000 > 60% × 100000 = 60000 → capped
  const result = compute({
    line_11_cash_contributions: 40_000,
    line_13_contribution_carryover: 30_000,
    agi: 100_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 60_000);
});

Deno.test("scheduleA.compute: contributions with no AGI pass through uncapped (zero AGI guard)", () => {
  // When AGI not provided, implementation uses 0; with agi=0 limit would be 0,
  // but the code uses: agi > 0 ? min(...) : raw — so raw passes through
  const result = compute({ line_11_cash_contributions: 5_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 5_000);
});

// =============================================================================
// 7. TOTAL ITEMIZED DEDUCTIONS — routes to f1040 line12e
// =============================================================================

Deno.test("scheduleA.compute: all-zero inputs produce zero total itemized deduction", () => {
  const result = compute({});
  assertEquals(f1040Input(result).line12e_itemized_deductions, 0);
});

Deno.test("scheduleA.compute: total itemized = medical + taxes + interest + contributions + casualty + other", () => {
  // medical: 10000 - (80000×7.5%) = 10000 - 6000 = 4000
  // SALT: 12000 + 6000 = 18000 (under 40000 cap); line6: 2000 → taxesTotal = 20000
  // interest: 15000
  // contributions: 3000 (under 60% of 80000=48000)
  // casualty: 2000; other: 500
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

Deno.test("scheduleA.compute: casualty loss enters total directly without re-applying floors", () => {
  // Form 4684 already applied $100/event and 10% AGI reductions
  const result = compute({ line_15_casualty_theft_loss: 4_200 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 4_200);
});

Deno.test("scheduleA.compute: other deductions enter total directly", () => {
  const result = compute({ line_16_other_deductions: 3_500 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 3_500);
});

Deno.test("scheduleA.compute: result always routes to f1040 line12e (even zero)", () => {
  const result = compute({});
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals((f1040Out!.fields as Record<string, number>).line12e_itemized_deductions, 0);
});

Deno.test("scheduleA.compute: result always routes to standard_deduction for comparison", () => {
  const result = compute({ line_8a_mortgage_interest_1098: 20_000 });
  const sdOut = findOutput(result, "standard_deduction");
  assertEquals(sdOut !== undefined, true);
  assertEquals((sdOut!.fields as Record<string, number>).itemized_deductions, 20_000);
});

// =============================================================================
// 8. FORCE FLAGS — routing hints, must not change deduction totals
// =============================================================================

Deno.test("scheduleA.compute: force_itemized does not change deduction total", () => {
  const withFlag = compute({ force_itemized: true, line_8a_mortgage_interest_1098: 20_000 });
  const withoutFlag = compute({ line_8a_mortgage_interest_1098: 20_000 });
  assertEquals(
    f1040Input(withFlag).line12e_itemized_deductions,
    f1040Input(withoutFlag).line12e_itemized_deductions,
  );
});

Deno.test("scheduleA.compute: force_standard does not crash and still routes f1040 output", () => {
  const result = compute({ force_standard: true });
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals((f1040Out!.fields as Record<string, number>).line12e_itemized_deductions, 0);
});

// =============================================================================
// 9. SMOKE TEST
// =============================================================================

Deno.test("scheduleA.compute: smoke — all major boxes populated produces correct total and form6251", () => {
  // Medical: 15000 - (120000 × 7.5%) = 15000 - 9000 = 6000
  // SALT: 20000 + 10000 + 3000 = 33000 (under 40000 cap)
  // line_6: 2500 → taxesTotal = 33000 + 2500 = 35500
  // Interest: 18000 + 1000 + 3000 = 22000
  // Contributions: 10000 + 5000 + 2000 = 17000 (17000 < 60% × 120000 = 72000)
  // Casualty: 4000; Other: 750
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

  assertEquals(f1040Input(result).line12e_itemized_deductions, 85_250);

  const form6251Out = findOutput(result, "form6251");
  assertEquals(form6251Out !== undefined, true);
  assertEquals((form6251Out!.fields as Record<string, number>).line2a_taxes_paid, 35_500);

  // three outputs: f1040, standard_deduction, form6251
  assertEquals(result.outputs.length, 3);
});

// ── MFS SALT cap ─────────────────────────────────────────────────────────────

Deno.test("MFS SALT cap: $25,000 SALT capped at $20,000 for MFS filer", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    line_5a_tax_amount: 15_000,
    line_5b_real_estate_tax: 10_000, // total SALT = $25,000 → capped at $20,000
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 20_000);
});

Deno.test("MFS SALT cap: $40,000 SALT capped at $20,000 for MFS (not $40,000)", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    line_5a_tax_amount: 40_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 20_000);
});

Deno.test("Non-MFS SALT cap: $35,000 SALT capped at $40,000 for Single filer", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    line_5a_tax_amount: 35_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 35_000);
});

Deno.test("No filing_status: SALT uses $40,000 cap (backward compatible)", () => {
  const result = compute({ line_5a_tax_amount: 50_000 });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 40_000);
});

// =============================================================================
// 10. OBBBA SALT PHASE-OUT — 30% of MAGI over $500K (single/MFJ/HOH), floor $10K
// =============================================================================

Deno.test("SALT phase-out: MAGI exactly $500,000 — no phase-out, cap stays $40,000", () => {
  // At threshold, no reduction
  const result = compute({
    filing_status: FilingStatus.Single,
    line_5a_tax_amount: 40_000,
    magi: 500_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 40_000);
});

Deno.test("SALT phase-out: MAGI $600,000 single — cap reduced to $10,000 (floor)", () => {
  // excess = 100K; reduction = 30% × 100K = 30K; cap = max(10K, 40K − 30K) = 10K
  const result = compute({
    filing_status: FilingStatus.Single,
    line_5a_tax_amount: 40_000,
    magi: 600_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 10_000);
});

Deno.test("SALT phase-out: MAGI $550,000 single — cap = $25,000", () => {
  // excess = 50K; reduction = 30% × 50K = 15K; cap = 40K − 15K = 25K
  const result = compute({
    filing_status: FilingStatus.Single,
    line_5a_tax_amount: 40_000,
    magi: 550_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 25_000);
});

Deno.test("SALT phase-out: MAGI $800,000 single — capped at floor $10,000", () => {
  // excess = 300K; reduction = 90K; cap = max(10K, 40K − 90K) = 10K
  const result = compute({
    filing_status: FilingStatus.Single,
    line_5a_tax_amount: 40_000,
    magi: 800_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 10_000);
});

Deno.test("SALT phase-out: actual SALT below phased-down cap — actual SALT allowed", () => {
  // cap at MAGI=550K = 25K; actual SALT = 15K < 25K → allowed = 15K
  const result = compute({
    filing_status: FilingStatus.Single,
    line_5a_tax_amount: 15_000,
    magi: 550_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 15_000);
});

Deno.test("SALT phase-out MFS: MAGI $300,000 — cap reduced to floor $5,000", () => {
  // MFS: threshold=250K, floor=5K; excess=50K; reduction=30%×50K=15K; cap=max(5K, 20K−15K)=5K
  const result = compute({
    filing_status: FilingStatus.MFS,
    line_5a_tax_amount: 20_000,
    magi: 300_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 5_000);
});

Deno.test("SALT phase-out MFS: MAGI $270,000 — cap = $14,000", () => {
  // excess=20K; reduction=30%×20K=6K; cap=20K−6K=14K
  const result = compute({
    filing_status: FilingStatus.MFS,
    line_5a_tax_amount: 20_000,
    magi: 270_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 14_000);
});

Deno.test("SALT phase-out: magi defaults to agi when not provided", () => {
  // agi=600K, no magi → uses agi for phase-out; cap = 10K
  const result = compute({
    filing_status: FilingStatus.Single,
    line_5a_tax_amount: 40_000,
    agi: 600_000,
  });
  assertEquals(f1040Input(result).line12e_itemized_deductions, 10_000);
});
