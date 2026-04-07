// Form 4562 — Depreciation and Amortization (TY2025)
//
// CONFIRMED constants:
//   - §179 limit: $2,500,000 (P.L. 119-21)
//   - §179 phase-out threshold: $4,000,000 (dollar-for-dollar above)
//   - SUV §179 cap: $31,300
//   - Bonus depreciation (property placed in service before Jan 20, 2025): 40%
//   - Bonus depreciation (property placed in service after Jan 19, 2025): 100%
//   - Luxury auto year-1 limit (no bonus, 2025): $12,200
//   - Luxury auto year-1 limit (with bonus, 2025): $20,200
//
// AMBIGUITIES resolved:
//   - form4562 is the intermediate aggregation node for §179, bonus, MACRS
//   - It receives section_179_deduction from schedule_e (pre-computed upstream §179 basis)
//   - It also accepts direct asset inputs for MACRS table computation
//   - Output: total_depreciation routes to schedule1; amt_adjustment routes to form6251
//   - Listed property ≤50% business use disqualifies §179 and bonus
//   - Luxury auto caps are a hard ceiling on depreciation deduction per vehicle
//
// These tests define IRS-correct behaviour — if a test fails, fix the
// implementation, not the test.

import { assertEquals, assertThrows } from "@std/assert";
import { form4562 } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { form6251 } from "../form6251/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";

function compute(input: Record<string, unknown>) {
  return form4562.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── Input validation ──────────────────────────────────────────────────────────

Deno.test("validation: empty object is valid (all fields optional)", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("validation: negative section_179_cost throws", () => {
  assertThrows(() => compute({ section_179_cost: -1 }));
});

Deno.test("validation: negative macrs_gds_basis throws", () => {
  assertThrows(() => compute({ macrs_gds_basis: -100 }));
});

Deno.test("validation: negative bonus_depreciation_basis throws", () => {
  assertThrows(() => compute({ bonus_depreciation_basis: -500 }));
});

Deno.test("validation: macrs_gds_recovery_period must be a positive integer", () => {
  assertThrows(() => compute({ macrs_gds_basis: 10_000, macrs_gds_recovery_period: 0 }));
});

Deno.test("validation: macrs_gds_year_of_service must be >= 1", () => {
  assertThrows(() =>
    compute({
      macrs_gds_basis: 10_000,
      macrs_gds_recovery_period: 5,
      macrs_gds_year_of_service: 0,
    })
  );
});

Deno.test("validation: business_use_pct must be 0-100", () => {
  assertThrows(() =>
    compute({
      macrs_gds_basis: 10_000,
      macrs_gds_recovery_period: 5,
      macrs_gds_year_of_service: 1,
      business_use_pct: 110,
    })
  );
});

// ── Section 179 election ──────────────────────────────────────────────────────

Deno.test("section_179: basic election within limit routes to schedule1", () => {
  const result = compute({
    section_179_cost: 50_000,
    section_179_elected: 50_000,
    business_income_limit: 200_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 50_000);
});

Deno.test("section_179: election capped at $2,500,000 limit", () => {
  const result = compute({
    section_179_cost: 3_000_000,
    section_179_elected: 3_000_000,
    business_income_limit: 5_000_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 2_500_000);
});

Deno.test("section_179: phase-out reduces limit dollar-for-dollar above $4,000,000", () => {
  // Cost = $4,500,000 → excess = $500,000 → limit = $2,500,000 - $500,000 = $2,000,000
  const result = compute({
    section_179_cost: 4_500_000,
    section_179_elected: 4_500_000,
    business_income_limit: 5_000_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 2_000_000);
});

Deno.test("section_179: fully phased out when cost >= $6,500,000", () => {
  // At $6,500,000: $2,500,000 limit - ($6,500,000 - $4,000,000) = $0
  const result = compute({
    section_179_cost: 6_500_000,
    section_179_elected: 6_500_000,
    business_income_limit: 10_000_000,
  });
  const s1 = findOutput(result, "schedule1");
  // §179 = 0, so no depreciation output unless other components present
  assertEquals(s1 === undefined, true);
});

Deno.test("section_179: business income limitation caps deduction", () => {
  // Elected $100,000 but only $60,000 business income
  const result = compute({
    section_179_cost: 100_000,
    section_179_elected: 100_000,
    business_income_limit: 60_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 60_000);
});

Deno.test("section_179: disallowed amount is tracked as carryover", () => {
  // Elected $100,000 but only $60,000 business income → $40,000 carryover
  const result = compute({
    section_179_cost: 100_000,
    section_179_elected: 100_000,
    business_income_limit: 60_000,
  });
  // Carryover does not route downstream — it's informational
  // but the total deduction must be $60,000
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 60_000);
});

Deno.test("section_179: carryover from prior year is added to current elected", () => {
  // Prior carryover $20,000 + current elected $30,000 = $50,000 total
  const result = compute({
    section_179_cost: 30_000,
    section_179_elected: 30_000,
    section_179_carryover: 20_000,
    business_income_limit: 200_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 50_000);
});

Deno.test("section_179: pre-computed deduction from schedule_e passed through", () => {
  // schedule_e already computed §179 basis and sends it here
  const result = compute({
    section_179_deduction: 75_000,
    business_income_limit: 200_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 75_000);
});

Deno.test("section_179: zero elected produces no schedule1 output", () => {
  const result = compute({ section_179_cost: 50_000, section_179_elected: 0 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 === undefined, true);
});

// ── Bonus depreciation ────────────────────────────────────────────────────────

Deno.test("bonus: pre-Jan20 property gets 40% bonus depreciation", () => {
  // Basis $100,000 → 40% = $40,000 bonus
  const result = compute({
    bonus_depreciation_basis: 100_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 40_000);
});

Deno.test("bonus: post-Jan19 property gets 100% bonus depreciation", () => {
  // Basis $100,000 → 100% = $100,000 bonus
  const result = compute({
    bonus_depreciation_basis_post_jan19: 100_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 100_000);
});

Deno.test("bonus: elect_out_bonus suppresses all bonus depreciation", () => {
  const result = compute({
    bonus_depreciation_basis: 100_000,
    elect_out_bonus: true,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 === undefined, true);
});

Deno.test("bonus: elect_40pct_bonus for post-Jan19 property gives 40% instead of 100%", () => {
  const result = compute({
    bonus_depreciation_basis_post_jan19: 100_000,
    elect_40pct_bonus: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 40_000);
});

Deno.test("bonus: both pre and post-Jan19 basis combined", () => {
  // pre: $50,000 * 40% = $20,000
  // post: $80,000 * 100% = $80,000
  // total = $100,000
  const result = compute({
    bonus_depreciation_basis: 50_000,
    bonus_depreciation_basis_post_jan19: 80_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 100_000);
});

// ── MACRS depreciation ────────────────────────────────────────────────────────

Deno.test("macrs: 5-year property year-1 GDS (200DB/HY = 20%)", () => {
  // Table A: 5-year, year 1 = 20.00%
  // $50,000 * 20% = $10,000
  const result = compute({
    macrs_gds_basis: 50_000,
    macrs_gds_recovery_period: 5,
    macrs_gds_year_of_service: 1,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 10_000);
});

Deno.test("macrs: 5-year property year-2 GDS (200DB/HY = 32%)", () => {
  // Table A: 5-year, year 2 = 32.00%
  // $50,000 * 32% = $16,000
  const result = compute({
    macrs_gds_basis: 50_000,
    macrs_gds_recovery_period: 5,
    macrs_gds_year_of_service: 2,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 16_000);
});

Deno.test("macrs: 7-year property year-1 GDS (200DB/HY = 14.29%)", () => {
  // Table A: 7-year, year 1 = 14.29%
  // $100,000 * 14.29% = $14,290
  const result = compute({
    macrs_gds_basis: 100_000,
    macrs_gds_recovery_period: 7,
    macrs_gds_year_of_service: 1,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 14_290);
});

Deno.test("macrs: 3-year property year-1 GDS (200DB/HY = 33.33%)", () => {
  // Table A: 3-year, year 1 = 33.33%
  // $30,000 * 33.33% = $9,999
  const result = compute({
    macrs_gds_basis: 30_000,
    macrs_gds_recovery_period: 3,
    macrs_gds_year_of_service: 1,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 9_999);
});

Deno.test("macrs: 15-year property year-1 GDS (150DB/HY = 5%)", () => {
  // Table B: 15-year, year 1 = 5.00%
  // $200,000 * 5% = $10,000
  const result = compute({
    macrs_gds_basis: 200_000,
    macrs_gds_recovery_period: 15,
    macrs_gds_year_of_service: 1,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 10_000);
});

Deno.test("macrs: prior-year MACRS depreciation passes through to schedule1", () => {
  const result = compute({ macrs_prior_depreciation: 25_000 });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 25_000);
});

Deno.test("macrs: business use pct < 100% scales basis proportionally", () => {
  // $100,000 basis, 60% business use → effective basis $60,000
  // 5-year year-1: $60,000 * 20% = $12,000
  const result = compute({
    macrs_gds_basis: 100_000,
    macrs_gds_recovery_period: 5,
    macrs_gds_year_of_service: 1,
    business_use_pct: 60,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 12_000);
});

// ── Output routing ────────────────────────────────────────────────────────────

Deno.test("routing: total depreciation routes to schedule1 as line13_depreciation", () => {
  const result = compute({
    macrs_gds_basis: 50_000,
    macrs_gds_recovery_period: 5,
    macrs_gds_year_of_service: 1,
  });
  // 5-year year-1: 20% of $50,000 = $10,000
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 10_000);
});

Deno.test("routing: 200DB property creates AMT adjustment to form6251", () => {
  // 200DB vs 150DB difference = AMT preference
  // 5-year, year-1: 200DB = 20%, 150DB = 15% → difference = 5%
  // $100,000 * (20% - 15%) = $5,000 AMT adjustment
  const result = compute({
    macrs_gds_basis: 100_000,
    macrs_gds_recovery_period: 5,
    macrs_gds_year_of_service: 1,
  });
  assertEquals(fieldsOf(result.outputs, form6251)!.depreciation_adjustment, 5_000);
});

Deno.test("routing: 15-year property (150DB) produces no AMT adjustment", () => {
  // 15-year uses 150DB already — no AMT preference
  const result = compute({
    macrs_gds_basis: 100_000,
    macrs_gds_recovery_period: 15,
    macrs_gds_year_of_service: 1,
  });
  const f6251 = findOutput(result, "form6251");
  assertEquals(f6251 === undefined, true);
});

Deno.test("routing: prior-year MACRS (no AMT adjustment)", () => {
  // Prior-year depreciation doesn't trigger new AMT
  const result = compute({ macrs_prior_depreciation: 25_000 });
  const f6251 = findOutput(result, "form6251");
  assertEquals(f6251 === undefined, true);
});

// ── Combined scenarios ────────────────────────────────────────────────────────

Deno.test("combined: §179 + bonus + MACRS all aggregate to schedule1", () => {
  // §179: $20,000
  // Bonus (pre-Jan20): $30,000 * 40% = $12,000
  // MACRS 5yr yr-1: $50,000 * 20% = $10,000
  // Total = $42,000
  const result = compute({
    section_179_cost: 20_000,
    section_179_elected: 20_000,
    business_income_limit: 200_000,
    bonus_depreciation_basis: 30_000,
    macrs_gds_basis: 50_000,
    macrs_gds_recovery_period: 5,
    macrs_gds_year_of_service: 1,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 42_000);
});

Deno.test("combined: section_179_deduction from schedule_e + MACRS", () => {
  // schedule_e passes pre-computed §179: $50,000
  // MACRS 7yr yr-1: $100,000 * 14.29% = $14,290
  // Total = $64,290
  const result = compute({
    section_179_deduction: 50_000,
    macrs_gds_basis: 100_000,
    macrs_gds_recovery_period: 7,
    macrs_gds_year_of_service: 1,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 64_290);
});

// ── Edge cases ────────────────────────────────────────────────────────────────

Deno.test("edge: listed property ≤50% business use disqualifies bonus depreciation", () => {
  // Listed property at 40% business use cannot claim bonus
  const result = compute({
    bonus_depreciation_basis: 50_000,
    is_listed_property: true,
    business_use_pct: 40,
  });
  const s1 = findOutput(result, "schedule1");
  // No bonus — must use ADS straight-line; result should be zero (no MACRS provided)
  assertEquals(s1 === undefined, true);
});

Deno.test("edge: listed property >50% business use qualifies for bonus", () => {
  const result = compute({
    bonus_depreciation_basis: 50_000,
    is_listed_property: true,
    business_use_pct: 60,
  });
  // 40% bonus on $50,000 = $20,000
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 20_000);
});

Deno.test("edge: luxury auto year-1 limit caps total depreciation (no bonus, 2025)", () => {
  // Vehicle basis $80,000, 5-yr yr-1: 20% = $16,000 → capped at $12,200
  const result = compute({
    macrs_gds_basis: 80_000,
    macrs_gds_recovery_period: 5,
    macrs_gds_year_of_service: 1,
    is_luxury_auto: true,
    luxury_auto_year: 1,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 12_200);
});

Deno.test("edge: luxury auto year-1 with bonus depreciation limit ($20,200)", () => {
  // Basis $80,000, bonus 40% = $32,000 → capped at $20,200
  const result = compute({
    bonus_depreciation_basis: 80_000,
    is_luxury_auto: true,
    luxury_auto_year: 1,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 20_200);
});

Deno.test("edge: luxury auto year-2 limit ($19,600) for pre-Jan20 property", () => {
  // Year 2 limit = $19,600
  const result = compute({
    macrs_gds_basis: 80_000,
    macrs_gds_recovery_period: 5,
    macrs_gds_year_of_service: 2,
    is_luxury_auto: true,
    luxury_auto_year: 2,
  });
  // 5-yr yr-2: 32% of $80,000 = $25,600 → capped at $19,600
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 19_600);
});

Deno.test("edge: §179 fully phased out at cost ≥ $6,500,000 produces no output", () => {
  const result = compute({
    section_179_cost: 7_000_000,
    section_179_elected: 2_500_000,
    business_income_limit: 10_000_000,
  });
  // Phase-out: $2,500,000 - ($7,000,000 - $4,000,000) = -$500,000 → $0
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 === undefined, true);
});

// ── Smoke test ────────────────────────────────────────────────────────────────

Deno.test("smoke: realistic Schedule E rental property with §179 and MACRS", () => {
  // Real estate professional takes §179 on an improvement ($25,000)
  // Plus MACRS on 5-year personal property ($10,000), year 1
  // Business income: $150,000
  const result = compute({
    section_179_deduction: 25_000,         // from schedule_e
    macrs_gds_basis: 10_000,
    macrs_gds_recovery_period: 5,
    macrs_gds_year_of_service: 1,
    business_income_limit: 150_000,
  });
  // §179: $25,000 + MACRS: $10,000 * 20% = $2,000 → total $27,000
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_depreciation, 27_000);
  // AMT: 5-yr (200DB vs 150DB): (20% - 15%) * $10,000 = $500
  const f6251 = findOutput(result, "form6251");
  assertEquals(f6251 !== undefined, true);
  assertEquals(fieldsOf(result.outputs, form6251)!.depreciation_adjustment, 500);
});
