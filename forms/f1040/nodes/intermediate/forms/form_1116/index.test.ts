import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus, IncomeCategory, form1116, inputSchema } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { form6251 } from "../form6251/index.ts";

function compute(input: Record<string, unknown>) {
  return form1116.compute({ taxYear: 2025 }, inputSchema.parse(input));
}

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: no foreign income → no outputs", () => {
  const result = compute({
    foreign_tax_paid: 0,
    foreign_income: 0,
    total_income: 50000,
    us_tax_before_credits: 6000,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.Single,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── De minimis — above threshold routes to form_1116 ────────────────────────
// The upstream nodes (f1099div/f1099int) only route to form_1116 when foreign
// taxes exceed the de minimis threshold ($300 single / $600 MFJ). This test
// verifies that when we receive input, we compute the limitation correctly.

Deno.test("de minimis: taxes = 350 (above $300 single) → limitation applies", () => {
  // FTC limit = 6000 × (500 / 50000) = 60
  // credit = min(350, 60) = 60 (limited)
  const result = compute({
    foreign_tax_paid: 350,
    foreign_income: 500,
    total_income: 50000,
    us_tax_before_credits: 6000,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.Single,
  });
  assertEquals(fieldsOf(result.outputs, schedule3)!.line1_foreign_tax_credit, 60);
});

Deno.test("de minimis: taxes = 700 (above $600 MFJ) → limitation applies", () => {
  // FTC limit = 8000 × (2000 / 80000) = 200
  // credit = min(700, 200) = 200 (limited)
  const result = compute({
    foreign_tax_paid: 700,
    foreign_income: 2000,
    total_income: 80000,
    us_tax_before_credits: 8000,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.MFJ,
  });
  assertEquals(fieldsOf(result.outputs, schedule3)!.line1_foreign_tax_credit, 200);
});

// ─── FTC < limitation → full credit allowed ───────────────────────────────────

Deno.test("ftc below limit: foreign taxes < ftc_limit → full credit allowed", () => {
  // FTC limit = 5000 × (10000 / 50000) = 1000
  // credit = min(400, 1000) = 400 (full credit, taxes < limit)
  const result = compute({
    foreign_tax_paid: 400,
    foreign_income: 10000,
    total_income: 50000,
    us_tax_before_credits: 5000,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.Single,
  });
  assertEquals(fieldsOf(result.outputs, schedule3)!.line1_foreign_tax_credit, 400);
});

// ─── FTC > limitation → limited ──────────────────────────────────────────────

Deno.test("ftc above limit: foreign taxes > ftc_limit → credit is capped at limit", () => {
  // FTC limit = 10000 × (1000 / 100000) = 100
  // credit = min(500, 100) = 100 (capped)
  const result = compute({
    foreign_tax_paid: 500,
    foreign_income: 1000,
    total_income: 100000,
    us_tax_before_credits: 10000,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.Single,
  });
  assertEquals(fieldsOf(result.outputs, schedule3)!.line1_foreign_tax_credit, 100);
});

// ─── Zero US tax → no credit ──────────────────────────────────────────────────

Deno.test("zero us tax: us_tax_before_credits = 0 → no credit output", () => {
  const result = compute({
    foreign_tax_paid: 500,
    foreign_income: 5000,
    total_income: 50000,
    us_tax_before_credits: 0,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.Single,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Passive category income ──────────────────────────────────────────────────

Deno.test("passive category: standard 1099 dividend/interest foreign tax path", () => {
  // FTC limit = 3000 × (2000 / 40000) = 150
  // credit = min(200, 150) = 150 (capped at limit)
  const result = compute({
    foreign_tax_paid: 200,
    foreign_income: 2000,
    total_income: 40000,
    us_tax_before_credits: 3000,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.Single,
  });
  assertEquals(fieldsOf(result.outputs, schedule3)!.line1_foreign_tax_credit, 150);
});

// ─── General category income ──────────────────────────────────────────────────

Deno.test("general category: wages from foreign employer", () => {
  // FTC limit = 12000 × (30000 / 90000) = 4000
  // credit = min(3500, 4000) = 3500 (full credit, taxes < limit)
  const result = compute({
    foreign_tax_paid: 3500,
    foreign_income: 30000,
    total_income: 90000,
    us_tax_before_credits: 12000,
    income_category: IncomeCategory.General,
    filing_status: FilingStatus.Single,
  });
  assertEquals(fieldsOf(result.outputs, schedule3)!.line1_foreign_tax_credit, 3500);
});

// ─── Limitation fraction capped at 1.0 ───────────────────────────────────────

Deno.test("fraction cap: foreign_income >= total_income → fraction = 1.0, credit = us_tax", () => {
  // foreign_income (60000) >= total_income (50000) → fraction capped at 1.0
  // FTC limit = 5000 × 1.0 = 5000
  // credit = min(4000, 5000) = 4000
  const result = compute({
    foreign_tax_paid: 4000,
    foreign_income: 60000,
    total_income: 50000,
    us_tax_before_credits: 5000,
    income_category: IncomeCategory.General,
    filing_status: FilingStatus.Single,
  });
  assertEquals(fieldsOf(result.outputs, schedule3)!.line1_foreign_tax_credit, 4000);
});

// ─── Output routing to schedule3 ─────────────────────────────────────────────

Deno.test("routing: credit routes to schedule3 line1_foreign_tax_credit", () => {
  // FTC limit = 4000 × (5000 / 50000) = 400
  // credit = min(300, 400) = 300 (full credit, taxes < limit)
  const result = compute({
    foreign_tax_paid: 300,
    foreign_income: 5000,
    total_income: 50000,
    us_tax_before_credits: 4000,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.Single,
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule3");
  assertEquals(fieldsOf(result.outputs, schedule3)!.line1_foreign_tax_credit, 300);
});

// ─── Validation ───────────────────────────────────────────────────────────────

Deno.test("validation: foreign_income > total_income is allowed (capped fraction)", () => {
  // Should not throw — foreign income > total is unusual but handled by capping fraction
  const result = compute({
    foreign_tax_paid: 100,
    foreign_income: 80000,
    total_income: 50000,
    us_tax_before_credits: 3000,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.Single,
  });
  assertEquals(fieldsOf(result.outputs, schedule3)!.line1_foreign_tax_credit, 100);
});

Deno.test("validation: negative foreign_tax_paid throws", () => {
  assertThrows(() => {
    compute({
      foreign_tax_paid: -100,
      foreign_income: 5000,
      total_income: 50000,
      us_tax_before_credits: 4000,
      income_category: IncomeCategory.Passive,
      filing_status: FilingStatus.Single,
    });
  });
});

Deno.test("validation: zero total_income with foreign_income > 0 → fraction = 1.0 (no division by zero)", () => {
  // Degenerate case: no total income but has foreign income → fraction capped at 1.0
  // credit = min(200, us_tax) = min(200, 1000) = 200
  const result = compute({
    foreign_tax_paid: 200,
    foreign_income: 1000,
    total_income: 0,
    us_tax_before_credits: 1000,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.Single,
  });
  assertEquals(fieldsOf(result.outputs, schedule3)!.line1_foreign_tax_credit, 200);
});

// ─── AMT FTC (IRC §59(a)) ─────────────────────────────────────────────────────

Deno.test("amt ftc: no tentative_minimum_tax → no form6251 output", () => {
  // Without TMT supplied, AMT FTC cannot be computed — no form6251 output
  const result = compute({
    foreign_tax_paid: 500,
    foreign_income: 5000,
    total_income: 50000,
    us_tax_before_credits: 4000,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.Single,
  });
  const f6251 = result.outputs.find((o) => o.nodeType === "form6251");
  assertEquals(f6251, undefined);
});

Deno.test("amt ftc: zero tentative_minimum_tax → no form6251 output", () => {
  const result = compute({
    foreign_tax_paid: 500,
    foreign_income: 5000,
    total_income: 50000,
    us_tax_before_credits: 4000,
    tentative_minimum_tax: 0,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.Single,
  });
  const f6251 = result.outputs.find((o) => o.nodeType === "form6251");
  assertEquals(f6251, undefined);
});

Deno.test("amt ftc: taxes below AMT limit → full foreign taxes allowed as AMT FTC", () => {
  // TMT = 10000, fraction = 5000/50000 = 0.10, AMT limit = 10000 × 0.10 = 1000
  // foreign_tax_paid = 300 < 1000 → AMT FTC = 300
  const result = compute({
    foreign_tax_paid: 300,
    foreign_income: 5000,
    total_income: 50000,
    us_tax_before_credits: 4000,
    tentative_minimum_tax: 10_000,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.Single,
  });
  assertEquals(fieldsOf(result.outputs, form6251)!.amtftc, 300);
});

Deno.test("amt ftc: taxes above AMT limit → AMT FTC capped at limit", () => {
  // TMT = 5000, fraction = 1000/50000 = 0.02, AMT limit = 5000 × 0.02 = 100
  // foreign_tax_paid = 500 > 100 → AMT FTC = 100
  const result = compute({
    foreign_tax_paid: 500,
    foreign_income: 1000,
    total_income: 50000,
    us_tax_before_credits: 4000,
    tentative_minimum_tax: 5_000,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.Single,
  });
  assertEquals(fieldsOf(result.outputs, form6251)!.amtftc, 100);
});

Deno.test("amt ftc: fraction = 1.0 (all income foreign) → AMT FTC capped at TMT", () => {
  // fraction = min(1.0, 60000/50000) = 1.0; limit = TMT × 1.0 = TMT
  // foreign_tax_paid = 8000 > TMT 6000 → AMT FTC = 6000
  const result = compute({
    foreign_tax_paid: 8_000,
    foreign_income: 60_000,
    total_income: 50_000,
    us_tax_before_credits: 5_000,
    tentative_minimum_tax: 6_000,
    income_category: IncomeCategory.General,
    filing_status: FilingStatus.Single,
  });
  assertEquals(fieldsOf(result.outputs, form6251)!.amtftc, 6_000);
});

Deno.test("amt ftc: emits both schedule3 and form6251 outputs when both credits > 0", () => {
  // Regular FTC: limit = 4000 × (5000/50000) = 400; credit = min(300, 400) = 300
  // AMT FTC: limit = 8000 × (5000/50000) = 800; amtftc = min(300, 800) = 300
  const result = compute({
    foreign_tax_paid: 300,
    foreign_income: 5_000,
    total_income: 50_000,
    us_tax_before_credits: 4_000,
    tentative_minimum_tax: 8_000,
    income_category: IncomeCategory.Passive,
    filing_status: FilingStatus.Single,
  });
  assertEquals(result.outputs.length, 2);
  assertEquals(fieldsOf(result.outputs, schedule3)!.line1_foreign_tax_credit, 300);
  assertEquals(fieldsOf(result.outputs, form6251)!.amtftc, 300);
});
