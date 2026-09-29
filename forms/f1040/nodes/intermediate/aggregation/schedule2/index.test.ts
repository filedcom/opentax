import { assertEquals, assertThrows } from "@std/assert";
import { schedule2 } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { form8978_reporting_year } from "../../worksheets/form8978_reporting_year/index.ts";

function compute(input: Record<string, unknown>) {
  return schedule2.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── Input validation ────────────────────────────────────────────────────────

Deno.test("validation: empty input (no fields) produces no output", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("validation: all-zero fields produce no output", () => {
  const result = compute({
    uncollected_fica: 0,
    uncollected_fica_gtl: 0,
    golden_parachute_excise: 0,
    section409a_excise: 0,
    line17k_golden_parachute_excise: 0,
    line17h_nqdc_tax: 0,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("dealer-transfer repayments accumulate on Schedule 2 lines 1b and 1c", () => {
  const result = compute({
    line1b_new_clean_vehicle_repayment: [7_500, 7_500],
    line1c_prev_owned_clean_vehicle_repayment: 4_000,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line17_additional_taxes,
    19_000,
  );
  assertEquals(findOutput(result, "schedule2")?.fields, {
    line1b_new_clean_vehicle_repayment: 15_000,
    line1c_prev_owned_clean_vehicle_repayment: 4_000,
  });
});

// ── Per-field calculation ────────────────────────────────────────────────────

Deno.test("calc: uncollected_fica alone routes to f1040 line23", () => {
  const result = compute({ uncollected_fica: 500 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 500);
});

Deno.test("calc: uncollected_fica_gtl alone routes to f1040 line23", () => {
  const result = compute({ uncollected_fica_gtl: 300 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 300);
});

Deno.test("calc: golden_parachute_excise alone routes to f1040 line23", () => {
  const result = compute({ golden_parachute_excise: 1000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 1000);
});

Deno.test("calc: section409a_excise alone routes to f1040 line23", () => {
  const result = compute({ section409a_excise: 2000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 2000);
});

Deno.test("calc: line17k_golden_parachute_excise alone routes to f1040 line23", () => {
  const result = compute({ line17k_golden_parachute_excise: 60000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 60000);
});

Deno.test("calc: line17h_nqdc_tax alone routes to f1040 line23", () => {
  const result = compute({ line17h_nqdc_tax: 10000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 10000);
});

Deno.test("Form 8889 testing-period tax contributes to line 23 and chapter 1 offset classification", () => {
  const result = compute({ line17d_hsa_eligibility_tax: 50 });
  assertEquals(fieldsOf(result.outputs, f1040)?.line23_other_taxes, 50);
  assertEquals(
    fieldsOf(result.outputs, form8978_reporting_year)
      ?.schedule2_chapter1_part2_tax,
    50,
  );
});

// ── Line aggregation ─────────────────────────────────────────────────────────

Deno.test("agg: line13 = uncollected_fica + uncollected_fica_gtl", () => {
  const result = compute({ uncollected_fica: 400, uncollected_fica_gtl: 200 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 600);
});

Deno.test("agg: line17h = section409a_excise + line17h_nqdc_tax", () => {
  const result = compute({ section409a_excise: 3000, line17h_nqdc_tax: 2000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 5000);
});

Deno.test("agg: line17k = golden_parachute_excise + line17k_golden_parachute_excise", () => {
  const result = compute({
    golden_parachute_excise: 4000,
    line17k_golden_parachute_excise: 6000,
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 10000);
});

Deno.test("agg: total = line13 + line17h + line17k (all sources)", () => {
  const result = compute({
    uncollected_fica: 500, // line13
    uncollected_fica_gtl: 300, // line13 → line13 = 800
    section409a_excise: 2000, // line17h
    line17h_nqdc_tax: 1000, // line17h → line17h = 3000
    golden_parachute_excise: 4000, // line17k
    line17k_golden_parachute_excise: 6000, // line17k → line17k = 10000
    // total = 800 + 3000 + 10000 = 13800
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 13800);
});

// ── Output routing ───────────────────────────────────────────────────────────

Deno.test("routing: any non-zero input routes exactly one output to f1040", () => {
  const result = compute({ uncollected_fica: 100 });
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  assertEquals(f1040Outputs.length, 1);
});

Deno.test("routing: no output to f1040 when total is zero", () => {
  const result = compute({ uncollected_fica: 0 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("routing: Part II tax also supplies the credit-limit classification", () => {
  const result = compute({ uncollected_fica: 100 });
  const keys = Object.keys(fieldsOf(result.outputs, f1040)!);
  assertEquals(keys, ["line23_other_taxes", "credit_limit_schedule2_line1z"]);
});

// ── Edge cases ───────────────────────────────────────────────────────────────

Deno.test("edge: partial inputs — only some fields provided", () => {
  const result = compute({ uncollected_fica: 200, line17h_nqdc_tax: 500 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 700);
});

Deno.test("edge: single field with large value is routed correctly", () => {
  const result = compute({ line17k_golden_parachute_excise: 1_000_000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 1_000_000);
});

Deno.test("edge: uncollected_fica from W-2 A+B merges with uncollected_fica_gtl from M+N in line13", () => {
  // Simulates a taxpayer with tips (A+B) and GTL (M+N) on the same W-2
  const result = compute({ uncollected_fica: 120, uncollected_fica_gtl: 80 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 200);
});

Deno.test("edge: multiple 409A sources — W-2 code Z and 1099-MISC box15", () => {
  // W-2 Box12 Z = 4000 (already pre-multiplied by 20% upstream) + 1099-MISC 20% excise
  const result = compute({ section409a_excise: 4000, line17h_nqdc_tax: 2000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 6000);
});

Deno.test("edge: golden parachute from W-2 code K and 1099-NEC box3", () => {
  const result = compute({
    golden_parachute_excise: 3000,
    line17k_golden_parachute_excise: 7000,
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 10000);
});

// ── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: all input fields populated — correct total emitted to f1040", () => {
  // W-2 Box12:
  //   A+B (tips): 450 uncollected SS+Medicare
  //   M+N (GTL): 250 uncollected SS+Medicare
  //   K: 800 golden parachute excise (pre-computed at 20% by W-2 node)
  //   Z: 1600 §409A excise (pre-computed at 20% by W-2 node)
  // 1099-NEC box3: $15000 → line17k = 15000 * 0.20 = 3000
  // 1099-MISC box15: $10000 → line17h = 10000 * 0.20 = 2000
  //
  // Line 13 = 450 + 250 = 700
  // Line 17h = 1600 + 2000 = 3600
  // Line 17k = 800 + 3000 = 3800
  // Total = 700 + 3600 + 3800 = 8100
  const result = compute({
    uncollected_fica: 450,
    uncollected_fica_gtl: 250,
    golden_parachute_excise: 800,
    section409a_excise: 1600,
    line17k_golden_parachute_excise: 3000,
    line17h_nqdc_tax: 2000,
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 8100);
  // Return tax and classification worksheet each receive one output.
  assertEquals(result.outputs.length, 2);
});

// ── Previously untested major fields ─────────────────────────────────────────

Deno.test("calc: line4_se_tax alone routes to f1040 line23", () => {
  const result = compute({ line4_se_tax: 14_130 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 14_130);
});

Deno.test("calc: line5_unreported_tip_tax alone routes to f1040 line23", () => {
  const result = compute({ line5_unreported_tip_tax: 765 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 765);
});

Deno.test("calc: line1a_excess_advance_premium alone routes to f1040 line17", () => {
  const result = compute({ line1a_excess_advance_premium: 1_200 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 1_200);
});

Deno.test("calc: line9_household_employment alone routes to f1040 line23", () => {
  const result = compute({ line9_household_employment: 2_400 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 2_400);
});

Deno.test("calc: unsourced generic 3468 recapture fails closed", () => {
  assertThrows(
    () => compute({ line17a_investment_credit_recapture: 3_000 }),
    Error,
    "requires a specific Form 4255 credit-line source",
  );
});

Deno.test("calc: line17b_mortgage_subsidy_recapture alone routes to f1040 line23", () => {
  const result = compute({ line17b_mortgage_subsidy_recapture: 1_000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 1_000);
});

Deno.test("calc: line16_lihtc_recapture alone routes to f1040 line23", () => {
  const result = compute({ line16_lihtc_recapture: 750 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 750);
});

Deno.test("calc: line17z_other_additional_taxes alone routes to f1040 line23", () => {
  const result = compute({ line17z_other_additional_taxes: 800 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 800);
});

Deno.test("calc: line20 section 965 installment does not enter Form 1040 line 23", () => {
  const result = compute({ line20_965_tax_installment: 10_000 });
  assertEquals(fieldsOf(result.outputs, f1040), undefined);
});

Deno.test("routing: mixed Part I and Part II taxes stay separated", () => {
  // SE tax + AMT + household employment
  const result = compute({
    line4_se_tax: 14_130,
    line2_amt: 5_000,
    line9_household_employment: 2_400,
  });
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line17_additional_taxes, 5_000);
  assertEquals(fields.line23_other_taxes, 16_530);
});

Deno.test("agg: all fields populated — grand total is correct sum", () => {
  const result = compute({
    line2_amt: 1_000,
    line1a_excess_advance_premium: 200,
    line4_se_tax: 300,
    line5_unreported_tip_tax: 400,
    line6_uncollected_8919: 500,
    line9_household_employment: 600,
    line8_form5329_tax: 700,
    line20_965_tax_installment: 800,
    line17b_mortgage_subsidy_recapture: 1_000,
    line16_lihtc_recapture: 1_100,
    line11_additional_medicare: 1_200,
    line12_niit: 1_300,
    uncollected_fica: 1_400,
    uncollected_fica_gtl: 1_500,
    section409a_excise: 1_600,
    line17h_nqdc_tax: 1_700,
    golden_parachute_excise: 1_800,
    line17k_golden_parachute_excise: 1_900,
    line17e_archer_msa_tax: 2_000,
    line17f_medicare_advantage_msa_tax: 2_100,
    line17c_hsa_penalty: 2_300,
    line17z_other_additional_taxes: 2_600,
  });
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line17_additional_taxes, 1_200);
  assertEquals(fields.line23_other_taxes, 26_000);
});

// ── Previously untested fields ───────────────────────────────────────────────

Deno.test("calc: line2_amt alone routes to f1040 line17", () => {
  const result = compute({ line2_amt: 5_000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 5_000);
});

Deno.test("calc: line8_form5329_tax alone routes to f1040 line23", () => {
  const result = compute({ line8_form5329_tax: 300 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 300);
});

Deno.test("calc: line17e_archer_msa_tax alone routes to f1040 line23", () => {
  const result = compute({ line17e_archer_msa_tax: 400 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 400);
});

Deno.test("calc: line17f_medicare_advantage_msa_tax alone routes to f1040 line23", () => {
  const result = compute({ line17f_medicare_advantage_msa_tax: 500 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 500);
});

Deno.test("calc: line6_uncollected_8919 alone routes to f1040 line23", () => {
  const result = compute({ line6_uncollected_8919: 600 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 600);
});

Deno.test("calc: line17c_hsa_penalty alone routes to f1040 line23", () => {
  const result = compute({ line17c_hsa_penalty: 700 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 700);
});

Deno.test("calc: line11_additional_medicare alone routes to f1040 line23", () => {
  const result = compute({ line11_additional_medicare: 800 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 800);
});

Deno.test("calc: line12_niit alone routes to f1040 line23", () => {
  const result = compute({ line12_niit: 900 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line23_other_taxes, 900);
});

Deno.test("Schedule 2 keeps Chapter 1, non-Chapter-1, and unclassified tax distinct", () => {
  const result = compute({
    line8_form5329_tax: 100,
    line8_form5329_chapter1_tax: 40,
    line4_se_tax: 200,
    line17z_other_additional_taxes: 30,
  });
  const classified = fieldsOf(result.outputs, form8978_reporting_year)!;
  assertEquals(classified.schedule2_part2_tax, 330);
  assertEquals(classified.schedule2_chapter1_part2_tax, 40);
  assertEquals(classified.schedule2_unclassified_part2_tax, 30);
});

Deno.test("Schedule 2 classifies section 409A tax but not section 4999 excise, FICA, NIIT, or section 965 installments", () => {
  const result = compute({
    section409a_excise: 200,
    line17h_nqdc_tax: 300,
    golden_parachute_excise: 400,
    line17k_golden_parachute_excise: 100,
    line4_se_tax: 600,
    line12_niit: 700,
    line20_965_tax_installment: 800,
  });
  const classified = fieldsOf(result.outputs, form8978_reporting_year)!;
  assertEquals(classified.schedule2_part2_tax, 2_300);
  assertEquals(classified.schedule2_chapter1_part2_tax, 500);
  assertEquals(classified.schedule2_unclassified_part2_tax, 0);
  assertEquals(fieldsOf(result.outputs, f1040)?.line23_other_taxes, 2_300);
});

Deno.test("routing: Part I AMT stays separate from eight Part II tax fields", () => {
  const result = compute({
    line2_amt: 5_000,
    line8_form5329_tax: 300,
    line17e_archer_msa_tax: 400,
    line17f_medicare_advantage_msa_tax: 500,
    line6_uncollected_8919: 600,
    line17c_hsa_penalty: 700,
    line11_additional_medicare: 800,
    line12_niit: 900,
  });
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line17_additional_taxes, 5_000);
  assertEquals(fields.line23_other_taxes, 4_200);
});
