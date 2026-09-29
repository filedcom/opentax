import { assertEquals } from "@std/assert";
import { schedule3 } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";

function compute(input: Record<string, unknown>) {
  return schedule3.compute({ taxYear: 2025, formType: "f1040" }, input);
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
    line6c_adoption_credit: 0,
    line10_amount_paid_extension: 0,
    line11_excess_ss: 0,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("Form 2439 box 2 reaches Schedule 3 line 13a, line 15 and Form 1040 line 31 once", () => {
  const result = compute({ line13a_tax_paid_by_ric_or_reit: [1_500, 750] });
  assertEquals(findOutput(result, "schedule3")?.fields.line13a_total, 2_250);
  assertEquals(findOutput(result, "schedule3")?.fields.line15_total, 2_250);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line31_additional_payments,
    2_250,
  );
});

Deno.test("Schedule 3: Form 3800 pending source keeps the schedule available without gross credit", () => {
  const result = compute({ form3800_source_credit_pending: true });
  assertEquals(result.outputs.length, 1);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line20_nonrefundable_credits,
    undefined,
  );
  assertEquals(fieldsOf(result.outputs, f1040)?.credit_limit_schedule3_lines, {
    line1: 0,
    line2: 0,
    line3: 0,
    line4: 0,
    line5a: 0,
    line5b: 0,
    line6aGbc: 0,
    line6bPriorMinimumTax: 0,
    line6cAdoption: 0,
    line6dElderlyDisabled: 0,
    line6fCleanVehicle: 0,
    line6gMortgage: 0,
    line6hHomebuyer: 0,
    line6iElectricVehicle: 0,
    line6jRefueling: 0,
    line6kBondCredit: 0,
    line6lForm8978: 0,
    line6mUsedCleanVehicle: 0,
    line7: 0,
  });
});

Deno.test("Schedule 3: Form 8912 pending source supplies the shared credit-limit snapshot", () => {
  const result = compute({ form8912_source_credit_pending: true });
  assertEquals(result.outputs.length, 1);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.credit_limit_schedule3_lines?.line7,
    0,
  );
});

Deno.test("Schedule 3: sends Form 8936 tentative and priority amounts to Form 1040", () => {
  const result = compute({
    line1_foreign_tax_credit: 500,
    line6i_qualified_electric_vehicle_credit: 200,
    line6f_clean_vehicle_credit: [3_000, 2_000],
    line6m_prev_owned_clean_vehicle_credit: 4_000,
  });
  const f = fieldsOf(result.outputs, f1040)!;
  assertEquals(f.form8936_tentative_new_credit, 5_000);
  assertEquals(f.form8936_tentative_used_credit, 4_000);
  assertEquals(f.form8936_priority_personal_credits, 700);
  assertEquals(f.form8936_schedule3_line7_tentative, 9_200);
  assertEquals(findOutput(result, "schedule3")?.fields.line8_total, 9_700);
});

// ── Part I — per-field routing ───────────────────────────────────────────────

Deno.test("calc: line1_foreign_tax_credit alone → f1040 line20", () => {
  const result = compute({ line1_foreign_tax_credit: 400 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    400,
  );
  assertEquals(
    fieldsOf(result.outputs, f1040)!.credit_limit_schedule3_lines?.line1,
    400,
  );
});

Deno.test("Schedule 3 deposits adoption-priority lines without another late credit", () => {
  const result = compute({
    line1_foreign_tax_credit: 120,
    line5b_energy_efficient_home: 80,
    line6c_adoption_credit: 500,
  });
  const lines = fieldsOf(result.outputs, f1040)!.credit_limit_schedule3_lines;
  assertEquals(lines?.line1, 120);
  assertEquals(lines?.line5b, 80);
  assertEquals(lines?.line6cAdoption, 500);
  assertEquals(lines?.line7, 500);
});

Deno.test("calc: line1_foreign_tax_1099 alone → f1040 line20", () => {
  const result = compute({ line1_foreign_tax_1099: 250 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    250,
  );
});

Deno.test("Schedule 3 line 1 is included once in nonrefundable credits", () => {
  const result = compute({
    line1_foreign_tax_credit: 300,
    line1_foreign_tax_1099: [75, 45],
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line20_nonrefundable_credits,
    420,
  );
});

Deno.test("Schedule 3 line 6l includes the capped Form 8978 credit", () => {
  const result = compute({ line6l_form8978_credit: 500 });
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line20_nonrefundable_credits,
    500,
  );
  assertEquals(findOutput(result, "schedule3")?.fields.line8_total, 500);
});

Deno.test("Schedule 3 keeps DC homebuyer and bond credits out of line 6a", () => {
  const result = compute({
    line6h_dc_homebuyer_credit: 300,
    line6k_tax_credit_bonds: 450,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line20_nonrefundable_credits,
    750,
  );
  assertEquals(findOutput(result, "schedule3")?.fields.line7_total, 750);
  assertEquals(findOutput(result, "schedule3")?.fields.line6a_total, undefined);
});

Deno.test("Schedule 3 Form 4136 line 12 is a payment, not nonrefundable credit", () => {
  const result = compute({ line12_fuel_tax_credit: 125 });
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line31_additional_payments,
    125,
  );
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line20_nonrefundable_credits,
    undefined,
  );
  assertEquals(findOutput(result, "schedule3")?.fields.line15_total, 125);
});

Deno.test("calc: line2_childcare_credit alone → f1040 line20", () => {
  const result = compute({ line2_childcare_credit: 600 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    600,
  );
});

Deno.test("calc: line3_education_credit alone → f1040 line20", () => {
  const result = compute({ line3_education_credit: 1500 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    1500,
  );
});

Deno.test("calc: line4_retirement_savings_credit alone → f1040 line20", () => {
  const result = compute({ line4_retirement_savings_credit: 200 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    200,
  );
});

Deno.test("calc: Form 8911 Schedule 3 line 6j reaches Form 1040 line 20", () => {
  const result = compute({ line6j_alt_fuel_vehicle_refueling: 162 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    162,
  );
});

Deno.test("calc: line6c_adoption_credit alone → f1040 line20", () => {
  const result = compute({ line6c_adoption_credit: 5000 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    5000,
  );
});

// ── Part II — per-field routing ──────────────────────────────────────────────

Deno.test("calc: line10_amount_paid_extension alone → f1040 line31", () => {
  const result = compute({ line10_amount_paid_extension: 1200 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line31_additional_payments,
    1200,
  );
});

Deno.test("calc: line11_excess_ss alone → f1040 line31", () => {
  const result = compute({ line11_excess_ss: 340 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line31_additional_payments,
    340,
  );
});

// ── Part I aggregation ───────────────────────────────────────────────────────

Deno.test("agg: line1 = line1_foreign_tax_credit + line1_foreign_tax_1099", () => {
  const result = compute({
    line1_foreign_tax_credit: 300,
    line1_foreign_tax_1099: 100,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    400,
  );
});

Deno.test("agg: partITotal sums all Part I credits", () => {
  const result = compute({
    line1_foreign_tax_credit: 200, // line1a
    line1_foreign_tax_1099: 100, // line1b → line1 = 300
    line2_childcare_credit: 600, // line2
    line3_education_credit: 1500, // line3
    line4_retirement_savings_credit: 200, // line4
    line6c_adoption_credit: 5000, // line6c
    // total = 300 + 600 + 1500 + 200 + 5000 = 7600
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    7600,
  );
});

// ── Part II aggregation ──────────────────────────────────────────────────────

Deno.test("agg: partIITotal = line10 + line11", () => {
  const result = compute({
    line10_amount_paid_extension: 1000,
    line11_excess_ss: 500,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line31_additional_payments,
    1500,
  );
});

// ── Routing separation ───────────────────────────────────────────────────────

Deno.test("routing: Part I → line20, Part II → line31, both present in same output", () => {
  const result = compute({
    line1_foreign_tax_credit: 400,
    line10_amount_paid_extension: 600,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    400,
  );
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line31_additional_payments,
    600,
  );
  assertEquals(result.outputs.length, 2);
});

Deno.test("routing: line20 and its credit detail emitted when Part II is zero", () => {
  const result = compute({ line1_foreign_tax_credit: 100 });
  const keys = Object.keys(fieldsOf(result.outputs, f1040)!);
  assertEquals(keys, [
    "line20_nonrefundable_credits",
    "credit_limit_schedule3_lines",
  ]);
});

Deno.test("routing: line31 and empty credit detail emitted when Part I is zero", () => {
  const result = compute({ line10_amount_paid_extension: 100 });
  const keys = Object.keys(fieldsOf(result.outputs, f1040)!);
  assertEquals(keys, [
    "line31_additional_payments",
    "credit_limit_schedule3_lines",
  ]);
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
  const result = compute({
    line3_education_credit: 1000,
    line11_excess_ss: 150,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    1000,
  );
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line31_additional_payments,
    150,
  );
});

Deno.test("edge: large values route correctly", () => {
  const result = compute({
    line6a_general_business_credit: 10_000,
    line10_amount_paid_extension: 50_000,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    10_000,
  );
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line31_additional_payments,
    50_000,
  );
});

// ── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: all fields populated — correct totals emitted to f1040", () => {
  // Taxpayer with:
  // - Form 1116 FTC: $300 + de minimis 1099: $50 → line1 = $350
  // - Childcare credit: $600
  // - Education credit (LLC): $1,500
  // - Saver's credit: $200
  // - Adoption credit: $5,000
  // → Part I total (line 20) = 350 + 600 + 1500 + 200 + 5000 = 7650
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
    line6c_adoption_credit: 5000,
    line10_amount_paid_extension: 1200,
    line11_excess_ss: 340,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    7650,
  );
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line31_additional_payments,
    1540,
  );
  assertEquals(result.outputs.length, 2);
});

// ── Previously untested Part I credits ───────────────────────────────────────

Deno.test("calc: line5b energy efficient home alone → f1040 line20", () => {
  const result = compute({ line5b_energy_efficient_home: 1_200 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    1_200,
  );
});

Deno.test("calc: line6f_clean_vehicle_credit alone → f1040 line20", () => {
  const result = compute({ line6f_clean_vehicle_credit: 7_500 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    7_500,
  );
});

Deno.test("Schedule 3 keeps new and previously owned clean vehicle credits on lines 6f and 6m", () => {
  const result = compute({
    line6f_clean_vehicle_credit: [3_750, 1_250],
    line6m_prev_owned_clean_vehicle_credit: [4_000, 1_000],
  });
  const schedule = findOutput(result, "schedule3")?.fields;
  assertEquals(schedule?.line6f_total, 5_000);
  assertEquals(schedule?.line6m_total, 5_000);
  assertEquals(schedule?.line7_total, 10_000);
  assertEquals(schedule?.line8_total, 10_000);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line20_nonrefundable_credits,
    10_000,
  );
});

Deno.test("Schedule 3 sums GBC producers into a single line 6a", () => {
  const result = compute({
    line6a_general_business_credit: [1_000, 2_000],
    line6a_low_income_housing_credit: 500,
  });
  assertEquals(findOutput(result, "schedule3")?.fields.line6a_total, 3_500);
  assertEquals(findOutput(result, "schedule3")?.fields.line7_total, 3_500);
});

Deno.test("calc: line6d_elderly_disabled_credit alone → f1040 line20", () => {
  const result = compute({ line6d_elderly_disabled_credit: 1_125 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    1_125,
  );
});

Deno.test("calc: line6b_prior_year_min_tax_credit alone → f1040 line20", () => {
  const result = compute({ line6b_prior_year_min_tax_credit: 800 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    800,
  );
});

Deno.test("calc: line6g_mortgage_interest_credit alone → f1040 line20", () => {
  const result = compute({ line6g_mortgage_interest_credit: 2_000 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    2_000,
  );
});

Deno.test("calc: line6a_general_business_credit alone → f1040 line20", () => {
  const result = compute({ line6a_general_business_credit: 5_000 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    5_000,
  );
});

Deno.test("calc: line6a_low_income_housing_credit alone → f1040 line20", () => {
  const result = compute({ line6a_low_income_housing_credit: 3_000 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    3_000,
  );
});

// ── Previously untested Part II payments ─────────────────────────────────────

Deno.test("calc: line9_premium_tax_credit alone → f1040 line31", () => {
  const result = compute({ line9_premium_tax_credit: 2_400 });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line31_additional_payments,
    2_400,
  );
});

// ── 3 credits sum correctly ───────────────────────────────────────────────────

Deno.test("agg: 3 Part I credits each $500 → total $1,500 on line20", () => {
  const result = compute({
    line2_childcare_credit: 500,
    line3_education_credit: 500,
    line4_retirement_savings_credit: 500,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    1_500,
  );
});

Deno.test("agg: partIITotal = line9 + line10 + line11", () => {
  const result = compute({
    line9_premium_tax_credit: 2_400,
    line10_amount_paid_extension: 1_200,
    line11_excess_ss: 340,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line31_additional_payments,
    3_940,
  );
});

Deno.test("agg: clean vehicle + residential energy + mortgage interest credit sum correctly", () => {
  const result = compute({
    line6f_clean_vehicle_credit: 7_500,
    line5b_energy_efficient_home: 1_200,
    line6g_mortgage_interest_credit: 2_000,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line20_nonrefundable_credits,
    10_700,
  );
});
