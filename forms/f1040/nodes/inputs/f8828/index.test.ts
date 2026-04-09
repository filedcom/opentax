import { assertEquals, assertThrows } from "@std/assert";
import { f8828 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    original_loan_amount: 100_000,
    subsidy_rate: 0.06,
    holding_period_years: 5,
    gain_on_sale: 50_000,
    modified_agi: 120_000,
    repayment_income_limit: 90_000,
    family_size: 3,
    ...overrides,
  };
}

function compute(item: ReturnType<typeof minimalItem>) {
  return f8828.compute({ taxYear: 2025, formType: "f1040" }, { f8828s: [item] });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8828.inputSchema: valid minimal item passes", () => {
  const parsed = f8828.inputSchema.safeParse({ f8828s: [minimalItem()] });
  assertEquals(parsed.success, true);
});

Deno.test("f8828.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8828.inputSchema.safeParse({ f8828s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8828.inputSchema: negative original_loan_amount fails", () => {
  const parsed = f8828.inputSchema.safeParse({
    f8828s: [minimalItem({ original_loan_amount: -1 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8828.inputSchema: negative gain_on_sale fails", () => {
  const parsed = f8828.inputSchema.safeParse({
    f8828s: [minimalItem({ gain_on_sale: -100 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8828.inputSchema: negative modified_agi fails", () => {
  const parsed = f8828.inputSchema.safeParse({
    f8828s: [minimalItem({ modified_agi: -1 })],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Core Recapture Calculation
// =============================================================================

Deno.test("f8828.compute: standard recapture routes to schedule2 line10_recapture_tax", () => {
  // federally_subsidized_amount = 100000 × 0.06 × 0.0625 = 375
  // year 5 holding percentage = 100% (1.0)
  // adjusted_recapture = 375 × 1.0 = 375
  // income_pct = (120000 / 90000) - 1 = 1/3
  // recapture = min(375 × (1/3), 50% × 50000) = min(125, 25000) = 125
  const result = compute(minimalItem());
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(Math.round(fields.line10_recapture_tax! * 1000) / 1000, 125);
});

Deno.test("f8828.compute: recapture capped at 50% of gain", () => {
  // Large loan, high subsidy, low gain → cap kicks in
  // federally_subsidized_amount = 500000 × 0.12 × 0.0625 = 3750
  // year 5 = 100% → adjusted = 3750
  // income_percentage = ((200000 / 100000) - 1) × 100 = 100% → capped at 50%
  // formula result = 3750 × 0.50 = 1875; 50% of gain = 0.5 × 1000 = 500
  // recapture = min(1875, 500) = 500
  const result = compute(minimalItem({
    original_loan_amount: 500_000,
    subsidy_rate: 0.12,
    holding_period_years: 5,
    gain_on_sale: 1_000,
    modified_agi: 200_000,
    repayment_income_limit: 100_000,
  }));
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line10_recapture_tax, 500);
});

// =============================================================================
// 3. Holding Period Percentage
// =============================================================================

Deno.test("f8828.compute: year 1 holding period = 20%", () => {
  // federally_subsidized_amount = 100000 × 0.06 × 0.0625 = 375
  // year 1 = 20% → adjusted = 375 × 0.20 = 75
  // income ratio: (150000/90000) - 1 = 66.67% → capped at 50%
  // recapture = min(75 × 0.50, 50000 × 0.50) = min(37.5, 25000) = 37.5
  const result = compute(minimalItem({ holding_period_years: 1, modified_agi: 150_000 }));
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line10_recapture_tax, 37.5);
});

Deno.test("f8828.compute: year 5 holding period = 100%", () => {
  // federally_subsidized_amount = 100000 × 0.06 × 0.0625 = 375
  // year 5 = 100% → adjusted = 375
  // income_ratio: (120000/90000) - 1 = 33.33%
  // recapture = min(375 × 0.3333, 25000) = min(125, 25000) = 125
  const result = compute(minimalItem({ holding_period_years: 5 }));
  const fields = fieldsOf(result.outputs, schedule2)!;
  // 100000 * 0.06 * 0.0625 = 375; 375 * 1.0 = 375; income_pct = (120000/90000)-1 = 1/3
  assertEquals(Math.round(fields.line10_recapture_tax! * 100), Math.round(375 * (1 / 3) * 100));
});

Deno.test("f8828.compute: year 9 holding period = 20%", () => {
  const result = compute(minimalItem({ holding_period_years: 9, modified_agi: 150_000 }));
  const fields = fieldsOf(result.outputs, schedule2)!;
  // 375 × 0.20 × 0.50 = 37.5
  assertEquals(fields.line10_recapture_tax, 37.5);
});

Deno.test("f8828.compute: holding period >= 10 years — no recapture", () => {
  const result = compute(minimalItem({ holding_period_years: 10 }));
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Income Percentage Thresholds
// =============================================================================

Deno.test("f8828.compute: modified_agi equal to repayment_income_limit — no recapture", () => {
  const result = compute(minimalItem({ modified_agi: 90_000, repayment_income_limit: 90_000 }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8828.compute: modified_agi below repayment_income_limit — no recapture", () => {
  const result = compute(minimalItem({ modified_agi: 80_000, repayment_income_limit: 90_000 }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8828.compute: modified_agi >= 150% of repayment_income_limit — income_pct capped at 50%", () => {
  // income_pct = (magi / limit) - 1 = (180000 / 90000) - 1 = 1.0 → capped at 50%
  // 375 × 1.0 × 0.50 = 187.5; min(187.5, 25000) = 187.5
  const result = compute(minimalItem({
    modified_agi: 180_000,
    repayment_income_limit: 90_000,
    holding_period_years: 5,
  }));
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line10_recapture_tax, 187.5);
});

Deno.test("f8828.compute: modified_agi at exactly 125% — income_pct = 25%", () => {
  // income_pct = (112500 / 90000) - 1 = 0.25 = 25%; not capped
  // 375 × 1.0 × 0.25 = 93.75; min(93.75, 25000) = 93.75
  const result = compute(minimalItem({
    modified_agi: 112_500,
    repayment_income_limit: 90_000,
    holding_period_years: 5,
  }));
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line10_recapture_tax, 93.75);
});

// =============================================================================
// 5. Gain On Sale = 0 — no recapture
// =============================================================================

Deno.test("f8828.compute: gain_on_sale = 0 — no recapture (cap = 0)", () => {
  const result = compute(minimalItem({ gain_on_sale: 0 }));
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Federally Subsidized Amount Calculation
// =============================================================================

Deno.test("f8828.compute: exact federally_subsidized_amount calculation", () => {
  // loan=200000, rate=0.08
  // federally_subsidized_amount = 200000 × 0.08 × 0.0625 = 1000
  // year=5 → 100%; agi=200000, limit=100000 → agi ≥ 1.25×limit → 50%
  // recapture = min(1000 × 0.50, 0.50 × 500000) = min(500, 250000) = 500
  const result = compute(minimalItem({
    original_loan_amount: 200_000,
    subsidy_rate: 0.08,
    holding_period_years: 5,
    gain_on_sale: 500_000,
    modified_agi: 200_000,
    repayment_income_limit: 100_000,
  }));
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line10_recapture_tax, 500);
});

// =============================================================================
// 7. Hard Validation
// =============================================================================

Deno.test("f8828.compute: throws on negative original_loan_amount", () => {
  assertThrows(() => compute(minimalItem({ original_loan_amount: -1 })), Error);
});

Deno.test("f8828.compute: throws on negative gain_on_sale", () => {
  assertThrows(() => compute(minimalItem({ gain_on_sale: -100 })), Error);
});

Deno.test("f8828.compute: throws on negative modified_agi", () => {
  assertThrows(() => compute(minimalItem({ modified_agi: -1 })), Error);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f8828.compute: smoke test — full realistic scenario", () => {
  // Loan: $180,000 at 5.5% subsidy rate
  // federally_subsidized_amount = 180000 × 0.055 × 0.0625 = 618.75
  // Held 3 years → holding_pct = 60%
  // adjusted_recapture = 618.75 × 0.60 = 371.25
  // MAGI = $105,000; limit = $80,000
  // income_pct = (105000/80000) - 1 = 0.3125 (31.25%; not capped)
  // recapture = min(371.25 × 0.3125, 0.50 × 30000) = min(116.015625, 15000) = 116.015625
  const result = compute(minimalItem({
    original_loan_amount: 180_000,
    subsidy_rate: 0.055,
    holding_period_years: 3,
    gain_on_sale: 30_000,
    modified_agi: 105_000,
    repayment_income_limit: 80_000,
    family_size: 4,
  }));
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line10_recapture_tax, 116.015625);
  assertEquals(result.outputs.length, 1);
});
