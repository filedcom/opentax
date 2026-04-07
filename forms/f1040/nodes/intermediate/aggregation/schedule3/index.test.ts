import { assertEquals } from "@std/assert";
import { schedule3 } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";

function compute(input: Record<string, unknown>) {
  return schedule3.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── Input validation ─────────────────────────────────────────────────────────

Deno.test("validation: empty input produces no output", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("validation: all-zero fields produce no output", () => {
  const result = compute({
    line1_foreign_tax_credit: 0,
    line1_foreign_tax_1099: 0,
    line2_childcare_credit: 0,
    line3_education_credit: 0,
    line4_retirement_savings_credit: 0,
    line6b_child_tax_credit: 0,
    line6c_adoption_credit: 0,
    line10_amount_paid_extension: 0,
    line11_excess_ss: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// ── Part I — per-field routing ───────────────────────────────────────────────

Deno.test("calc: line1_foreign_tax_credit alone → f1040 line20", () => {
  const result = compute({ line1_foreign_tax_credit: 400 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 400);
});

Deno.test("calc: line1_foreign_tax_1099 alone → f1040 line20", () => {
  const result = compute({ line1_foreign_tax_1099: 250 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 250);
});

Deno.test("calc: line2_childcare_credit alone → f1040 line20", () => {
  const result = compute({ line2_childcare_credit: 600 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 600);
});

Deno.test("calc: line3_education_credit alone → f1040 line20", () => {
  const result = compute({ line3_education_credit: 1500 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 1500);
});

Deno.test("calc: line4_retirement_savings_credit alone → f1040 line20", () => {
  const result = compute({ line4_retirement_savings_credit: 200 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 200);
});

Deno.test("calc: line6b_child_tax_credit alone → f1040 line20", () => {
  const result = compute({ line6b_child_tax_credit: 2000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 2000);
});

Deno.test("calc: line6c_adoption_credit alone → f1040 line20", () => {
  const result = compute({ line6c_adoption_credit: 5000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 5000);
});

// ── Part II — per-field routing ──────────────────────────────────────────────

Deno.test("calc: line10_amount_paid_extension alone → f1040 line31", () => {
  const result = compute({ line10_amount_paid_extension: 1200 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line31_additional_payments, 1200);
});

Deno.test("calc: line11_excess_ss alone → f1040 line31", () => {
  const result = compute({ line11_excess_ss: 340 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line31_additional_payments, 340);
});

// ── Part I aggregation ───────────────────────────────────────────────────────

Deno.test("agg: line1 = line1_foreign_tax_credit + line1_foreign_tax_1099", () => {
  const result = compute({ line1_foreign_tax_credit: 300, line1_foreign_tax_1099: 100 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 400);
});

Deno.test("agg: partITotal sums all Part I credits", () => {
  const result = compute({
    line1_foreign_tax_credit: 200,   // line1a
    line1_foreign_tax_1099: 100,     // line1b → line1 = 300
    line2_childcare_credit: 600,     // line2
    line3_education_credit: 1500,    // line3
    line4_retirement_savings_credit: 200, // line4
    line6b_child_tax_credit: 2000,   // line6b
    line6c_adoption_credit: 5000,    // line6c
    // total = 300 + 600 + 1500 + 200 + 2000 + 5000 = 9600
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 9600);
});

// ── Part II aggregation ──────────────────────────────────────────────────────

Deno.test("agg: partIITotal = line10 + line11", () => {
  const result = compute({ line10_amount_paid_extension: 1000, line11_excess_ss: 500 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line31_additional_payments, 1500);
});

// ── Routing separation ───────────────────────────────────────────────────────

Deno.test("routing: Part I → line20, Part II → line31, both present in same output", () => {
  const result = compute({
    line1_foreign_tax_credit: 400,
    line10_amount_paid_extension: 600,
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 400);
  assertEquals(fieldsOf(result.outputs, f1040)!.line31_additional_payments, 600);
  assertEquals(result.outputs.length, 1);
});

Deno.test("routing: only line20 emitted when Part II is zero", () => {
  const result = compute({ line1_foreign_tax_credit: 100 });
  const keys = Object.keys(fieldsOf(result.outputs, f1040)!);
  assertEquals(keys, ["line20_nonrefundable_credits"]);
});

Deno.test("routing: only line31 emitted when Part I is zero", () => {
  const result = compute({ line10_amount_paid_extension: 100 });
  const keys = Object.keys(fieldsOf(result.outputs, f1040)!);
  assertEquals(keys, ["line31_additional_payments"]);
});

Deno.test("routing: exactly one f1040 output regardless of how many fields are set", () => {
  const result = compute({
    line1_foreign_tax_credit: 100,
    line2_childcare_credit: 200,
    line10_amount_paid_extension: 300,
    line11_excess_ss: 400,
  });
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  assertEquals(f1040Outputs.length, 1);
});

// ── Edge cases ───────────────────────────────────────────────────────────────

Deno.test("edge: only partial fields provided", () => {
  const result = compute({ line3_education_credit: 1000, line11_excess_ss: 150 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 1000);
  assertEquals(fieldsOf(result.outputs, f1040)!.line31_additional_payments, 150);
});

Deno.test("edge: large values route correctly", () => {
  const result = compute({ line6b_child_tax_credit: 10_000, line10_amount_paid_extension: 50_000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 10_000);
  assertEquals(fieldsOf(result.outputs, f1040)!.line31_additional_payments, 50_000);
});

// ── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: all fields populated — correct totals emitted to f1040", () => {
  // Taxpayer with:
  // - Form 1116 FTC: $300 + de minimis 1099: $50 → line1 = $350
  // - Childcare credit: $600
  // - Education credit (LLC): $1,500
  // - Saver's credit: $200
  // - Child tax credit (nonrefundable): $2,000
  // - Adoption credit: $5,000
  // → Part I total (line 20) = 350 + 600 + 1500 + 200 + 2000 + 5000 = 9650
  //
  // - Extension payment: $1,200
  // - Excess SS: $340 (two employers, both withheld max)
  // → Part II total (line 31) = 1200 + 340 = 1540
  const result = compute({
    line1_foreign_tax_credit: 300,
    line1_foreign_tax_1099: 50,
    line2_childcare_credit: 600,
    line3_education_credit: 1500,
    line4_retirement_savings_credit: 200,
    line6b_child_tax_credit: 2000,
    line6c_adoption_credit: 5000,
    line10_amount_paid_extension: 1200,
    line11_excess_ss: 340,
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 9650);
  assertEquals(fieldsOf(result.outputs, f1040)!.line31_additional_payments, 1540);
  assertEquals(result.outputs.length, 1);
});

// ── Previously untested Part I credits ───────────────────────────────────────

Deno.test("calc: line5_residential_energy alone → f1040 line20", () => {
  const result = compute({ line5_residential_energy: 1_200 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 1_200);
});

Deno.test("calc: line6d_clean_vehicle_credit alone → f1040 line20", () => {
  const result = compute({ line6d_clean_vehicle_credit: 7_500 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 7_500);
});

Deno.test("calc: line6d_elderly_disabled_credit alone → f1040 line20", () => {
  const result = compute({ line6d_elderly_disabled_credit: 1_125 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 1_125);
});

Deno.test("calc: line6e_prior_year_min_tax_credit alone → f1040 line20", () => {
  const result = compute({ line6e_prior_year_min_tax_credit: 800 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 800);
});

Deno.test("calc: line6f_mortgage_interest_credit alone → f1040 line20", () => {
  const result = compute({ line6f_mortgage_interest_credit: 2_000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 2_000);
});

Deno.test("calc: line6z_general_business_credit alone → f1040 line20", () => {
  const result = compute({ line6z_general_business_credit: 5_000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 5_000);
});

Deno.test("calc: line6b_low_income_housing_credit alone → f1040 line20", () => {
  const result = compute({ line6b_low_income_housing_credit: 3_000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 3_000);
});

// ── Previously untested Part II payments ─────────────────────────────────────

Deno.test("calc: line9_premium_tax_credit alone → f1040 line31", () => {
  const result = compute({ line9_premium_tax_credit: 2_400 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line31_additional_payments, 2_400);
});

Deno.test("calc: line13_1446_withholding alone → f1040 line31", () => {
  const result = compute({ line13_1446_withholding: 1_500 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line31_additional_payments, 1_500);
});

// ── 3 credits sum correctly ───────────────────────────────────────────────────

Deno.test("agg: 3 Part I credits each $500 → total $1,500 on line20", () => {
  const result = compute({
    line2_childcare_credit: 500,
    line3_education_credit: 500,
    line4_retirement_savings_credit: 500,
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 1_500);
});

Deno.test("agg: partIITotal = line9 + line10 + line11 + line13", () => {
  const result = compute({
    line9_premium_tax_credit: 2_400,
    line10_amount_paid_extension: 1_200,
    line11_excess_ss: 340,
    line13_1446_withholding: 1_500,
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line31_additional_payments, 5_440);
});

Deno.test("agg: clean vehicle + residential energy + mortgage interest credit sum correctly", () => {
  const result = compute({
    line6d_clean_vehicle_credit: 7_500,
    line5_residential_energy: 1_200,
    line6f_mortgage_interest_credit: 2_000,
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits, 10_700);
});
