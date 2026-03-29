import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus, IncomeCategory, form1116, inputSchema } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form1116.compute(inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
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
  const s3 = findOutput(result, "schedule3");
  assertEquals((s3!.input as Record<string, unknown>).line1_foreign_tax_credit, 60);
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
  const s3 = findOutput(result, "schedule3");
  assertEquals((s3!.input as Record<string, unknown>).line1_foreign_tax_credit, 200);
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
  const s3 = findOutput(result, "schedule3");
  assertEquals((s3!.input as Record<string, unknown>).line1_foreign_tax_credit, 400);
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
  const s3 = findOutput(result, "schedule3");
  assertEquals((s3!.input as Record<string, unknown>).line1_foreign_tax_credit, 100);
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
  const s3 = findOutput(result, "schedule3");
  assertEquals((s3!.input as Record<string, unknown>).line1_foreign_tax_credit, 150);
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
  const s3 = findOutput(result, "schedule3");
  assertEquals((s3!.input as Record<string, unknown>).line1_foreign_tax_credit, 3500);
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
  const s3 = findOutput(result, "schedule3");
  assertEquals((s3!.input as Record<string, unknown>).line1_foreign_tax_credit, 4000);
});

// ─── Output routing to schedule3 ─────────────────────────────────────────────

Deno.test("routing: credit routes to schedule3 line1_foreign_tax_credit", () => {
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
  const input = result.outputs[0].input as Record<string, unknown>;
  assertEquals(typeof input.line1_foreign_tax_credit, "number");
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
  const s3 = findOutput(result, "schedule3");
  assertEquals((s3!.input as Record<string, unknown>).line1_foreign_tax_credit, 100);
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
  const s3 = findOutput(result, "schedule3");
  assertEquals((s3!.input as Record<string, unknown>).line1_foreign_tax_credit, 200);
});
