import { assertEquals } from "@std/assert";
import { schedule2 } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";

function compute(input: Record<string, unknown>) {
  return schedule2.compute({ taxYear: 2025 }, input);
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

// ── Per-field calculation ────────────────────────────────────────────────────

Deno.test("calc: uncollected_fica alone routes to f1040 line17", () => {
  const result = compute({ uncollected_fica: 500 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 500);
});

Deno.test("calc: uncollected_fica_gtl alone routes to f1040 line17", () => {
  const result = compute({ uncollected_fica_gtl: 300 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 300);
});

Deno.test("calc: golden_parachute_excise alone routes to f1040 line17", () => {
  const result = compute({ golden_parachute_excise: 1000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 1000);
});

Deno.test("calc: section409a_excise alone routes to f1040 line17", () => {
  const result = compute({ section409a_excise: 2000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 2000);
});

Deno.test("calc: line17k_golden_parachute_excise alone routes to f1040 line17", () => {
  const result = compute({ line17k_golden_parachute_excise: 60000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 60000);
});

Deno.test("calc: line17h_nqdc_tax alone routes to f1040 line17", () => {
  const result = compute({ line17h_nqdc_tax: 10000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 10000);
});

// ── Line aggregation ─────────────────────────────────────────────────────────

Deno.test("agg: line13 = uncollected_fica + uncollected_fica_gtl", () => {
  const result = compute({ uncollected_fica: 400, uncollected_fica_gtl: 200 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 600);
});

Deno.test("agg: line17h = section409a_excise + line17h_nqdc_tax", () => {
  const result = compute({ section409a_excise: 3000, line17h_nqdc_tax: 2000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 5000);
});

Deno.test("agg: line17k = golden_parachute_excise + line17k_golden_parachute_excise", () => {
  const result = compute({ golden_parachute_excise: 4000, line17k_golden_parachute_excise: 6000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 10000);
});

Deno.test("agg: total = line13 + line17h + line17k (all sources)", () => {
  const result = compute({
    uncollected_fica: 500,      // line13
    uncollected_fica_gtl: 300,  // line13 → line13 = 800
    section409a_excise: 2000,   // line17h
    line17h_nqdc_tax: 1000,     // line17h → line17h = 3000
    golden_parachute_excise: 4000,              // line17k
    line17k_golden_parachute_excise: 6000,      // line17k → line17k = 10000
    // total = 800 + 3000 + 10000 = 13800
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 13800);
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

Deno.test("routing: output key is exactly line17_additional_taxes", () => {
  const result = compute({ uncollected_fica: 100 });
  const keys = Object.keys(fieldsOf(result.outputs, f1040)!);
  assertEquals(keys, ["line17_additional_taxes"]);
});

// ── Edge cases ───────────────────────────────────────────────────────────────

Deno.test("edge: partial inputs — only some fields provided", () => {
  const result = compute({ uncollected_fica: 200, line17h_nqdc_tax: 500 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 700);
});

Deno.test("edge: single field with large value is routed correctly", () => {
  const result = compute({ line17k_golden_parachute_excise: 1_000_000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 1_000_000);
});

Deno.test("edge: uncollected_fica from W-2 A+B merges with uncollected_fica_gtl from M+N in line13", () => {
  // Simulates a taxpayer with tips (A+B) and GTL (M+N) on the same W-2
  const result = compute({ uncollected_fica: 120, uncollected_fica_gtl: 80 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 200);
});

Deno.test("edge: multiple 409A sources — W-2 code Z and 1099-MISC box15", () => {
  // W-2 Box12 Z = 4000 (already pre-multiplied by 20% upstream) + 1099-MISC 20% excise
  const result = compute({ section409a_excise: 4000, line17h_nqdc_tax: 2000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 6000);
});

Deno.test("edge: golden parachute from W-2 code K and 1099-NEC box3", () => {
  const result = compute({ golden_parachute_excise: 3000, line17k_golden_parachute_excise: 7000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 10000);
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
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 8100);
  // Only one output
  assertEquals(result.outputs.length, 1);
});

// ── Previously untested major fields ─────────────────────────────────────────

Deno.test("calc: line4_se_tax alone routes to f1040 line17", () => {
  const result = compute({ line4_se_tax: 14_130 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 14_130);
});

Deno.test("calc: line5_unreported_tip_tax alone routes to f1040 line17", () => {
  const result = compute({ line5_unreported_tip_tax: 765 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 765);
});

Deno.test("calc: line2_excess_advance_premium alone routes to f1040 line17", () => {
  const result = compute({ line2_excess_advance_premium: 1_200 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 1_200);
});

Deno.test("calc: line7a_household_employment alone routes to f1040 line17", () => {
  const result = compute({ line7a_household_employment: 2_400 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 2_400);
});

Deno.test("calc: line17d_kiddie_tax alone routes to f1040 line17", () => {
  const result = compute({ line17d_kiddie_tax: 500 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 500);
});

Deno.test("calc: line17a_investment_credit_recapture alone routes to f1040 line17", () => {
  const result = compute({ line17a_investment_credit_recapture: 3_000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 3_000);
});

Deno.test("calc: line10_homebuyer_credit_repayment alone routes to f1040 line17", () => {
  const result = compute({ line10_homebuyer_credit_repayment: 500 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 500);
});

Deno.test("calc: line10_recapture_tax alone routes to f1040 line17", () => {
  const result = compute({ line10_recapture_tax: 1_000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 1_000);
});

Deno.test("calc: line10_lihtc_recapture alone routes to f1040 line17", () => {
  const result = compute({ line10_lihtc_recapture: 750 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 750);
});

Deno.test("calc: line17z_other_additional_taxes alone routes to f1040 line17", () => {
  const result = compute({ line17z_other_additional_taxes: 800 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 800);
});

Deno.test("calc: line17_exit_tax alone routes to f1040 line17", () => {
  const result = compute({ line17_exit_tax: 50_000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 50_000);
});

Deno.test("calc: line9_965_net_tax_liability alone routes to f1040 line17", () => {
  const result = compute({ line9_965_net_tax_liability: 10_000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 10_000);
});

Deno.test("calc: lump_sum_tax alone routes to f1040 line17", () => {
  const result = compute({ lump_sum_tax: 4_000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 4_000);
});

Deno.test("agg: 3 different tax sources sum to correct total", () => {
  // SE tax + AMT + household employment
  const result = compute({
    line4_se_tax: 14_130,
    line1_amt: 5_000,
    line7a_household_employment: 2_400,
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 21_530);
});

Deno.test("agg: all fields populated — grand total is correct sum", () => {
  const result = compute({
    line1_amt: 1_000,
    line2_excess_advance_premium: 200,
    line4_se_tax: 300,
    line5_unreported_tip_tax: 400,
    line6_uncollected_8919: 500,
    line7a_household_employment: 600,
    line8_form5329_tax: 700,
    line9_965_net_tax_liability: 800,
    line10_homebuyer_credit_repayment: 900,
    line10_recapture_tax: 1_000,
    line10_lihtc_recapture: 1_100,
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
    lump_sum_tax: 2_200,
    line17b_hsa_penalty: 2_300,
    line17d_kiddie_tax: 2_400,
    line17a_investment_credit_recapture: 2_500,
    line17z_other_additional_taxes: 2_600,
    line17_exit_tax: 2_700,
  });
  // 27 values from 1000 to 2700 in steps of 100 → sum = 38_700
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 38_700);
});

// ── Previously untested fields ───────────────────────────────────────────────

Deno.test("calc: line1_amt alone routes to f1040 line17", () => {
  const result = compute({ line1_amt: 5_000 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 5_000);
});

Deno.test("calc: line8_form5329_tax alone routes to f1040 line17", () => {
  const result = compute({ line8_form5329_tax: 300 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 300);
});

Deno.test("calc: line17e_archer_msa_tax alone routes to f1040 line17", () => {
  const result = compute({ line17e_archer_msa_tax: 400 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 400);
});

Deno.test("calc: line17f_medicare_advantage_msa_tax alone routes to f1040 line17", () => {
  const result = compute({ line17f_medicare_advantage_msa_tax: 500 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 500);
});

Deno.test("calc: line6_uncollected_8919 alone routes to f1040 line17", () => {
  const result = compute({ line6_uncollected_8919: 600 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 600);
});

Deno.test("calc: line17b_hsa_penalty alone routes to f1040 line17", () => {
  const result = compute({ line17b_hsa_penalty: 700 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 700);
});

Deno.test("calc: line11_additional_medicare alone routes to f1040 line17", () => {
  const result = compute({ line11_additional_medicare: 800 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 800);
});

Deno.test("calc: line12_niit alone routes to f1040 line17", () => {
  const result = compute({ line12_niit: 900 });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 900);
});

Deno.test("calc: all 8 previously untested fields sum correctly into line17", () => {
  // 5000 + 300 + 400 + 500 + 600 + 700 + 800 + 900 = 9200
  const result = compute({
    line1_amt: 5_000,
    line8_form5329_tax: 300,
    line17e_archer_msa_tax: 400,
    line17f_medicare_advantage_msa_tax: 500,
    line6_uncollected_8919: 600,
    line17b_hsa_penalty: 700,
    line11_additional_medicare: 800,
    line12_niit: 900,
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line17_additional_taxes, 9_200);
});
