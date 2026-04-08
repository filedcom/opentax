import { assertEquals, assertThrows } from "@std/assert";
import { w2, Box12Code } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form8839 } from "../../intermediate/forms/form8839/index.ts";
import { form2441 } from "../../intermediate/forms/form2441/index.ts";
import { form4137 } from "../../intermediate/forms/form4137/index.ts";
import { form8853 } from "../../intermediate/forms/form8853/index.ts";
import { form8880 } from "../../intermediate/forms/form8880/index.ts";
import { form8889 } from "../../intermediate/forms/form8889/index.ts";
import { form8959 } from "../../intermediate/forms/form8959/index.ts";
import { ira_deduction_worksheet } from "../../intermediate/worksheets/ira_deduction_worksheet/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { scheduleA } from "../schedule_a/index.ts";
import { scheduleC } from "../schedule_c/index.ts";

// ============================================================
// Helpers
// ============================================================

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    box1_wages: 0,
    box2_fed_withheld: 0,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return w2.compute({ taxYear: 2025 }, { w2s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ============================================================
// 1. Input Schema — non-obvious constraints only
// ============================================================

Deno.test("box12_enum_rejects_unknown_code: invalid Box12 code 'X9' fails schema", () => {
  const parsed = w2.inputSchema.safeParse({
    w2s: [{ box1_wages: 50000, box2_fed_withheld: 5000, box12_entries: [{ code: "X9", amount: 100 }] }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("empty_w2s_array_fails_min1: empty array fails min(1)", () => {
  const parsed = w2.inputSchema.safeParse({ w2s: [] });
  assertEquals(parsed.success, false);
});

// ============================================================
// 2. Single-W2 routing — exact field values
// ============================================================

Deno.test("box1_wages_route_to_f1040_line1a: $50,000 wages appear exactly on line1a", () => {
  const result = compute([minimalItem({ box1_wages: 50000 })]);
  assertEquals(fieldsOf(result.outputs, f1040)!.line1a_wages, 50000);
});

Deno.test("box2_fed_withheld_routes_to_f1040_line25a: $5,000 withheld appears exactly on line25a", () => {
  const result = compute([minimalItem({ box1_wages: 50000, box2_fed_withheld: 5000 })]);
  assertEquals(fieldsOf(result.outputs, f1040)!.line25a_w2_withheld, 5000);
});

Deno.test("box8_allocated_tips_routes_to_form4137: $2,000 allocated tips appear exactly on form4137", () => {
  const result = compute([minimalItem({ box1_wages: 40000, box8_allocated_tips: 2000 })]);
  assertEquals(fieldsOf(result.outputs, form4137)!.allocated_tips, 2000);
});

Deno.test("box10_dep_care_routes_to_form2441: $3,000 dep care appears exactly on form2441", () => {
  const result = compute([minimalItem({ box1_wages: 70000, box10_dep_care: 3000 })]);
  assertEquals(fieldsOf(result.outputs, form2441)!.dep_care_benefits, 3000);
});

Deno.test("box13_retirement_plan_routes_ira_worksheet: covered_by_retirement_plan = true", () => {
  const result = compute([minimalItem({ box1_wages: 80000, box13_retirement_plan: true })]);
  assertEquals(fieldsOf(result.outputs, ira_deduction_worksheet)!.covered_by_retirement_plan, true);
});

// ============================================================
// 3. Statutory employee fork
// ============================================================

Deno.test("statutory_employee_wages_route_to_schedule_c: wages excluded from f1040 line1a", () => {
  const result = compute([minimalItem({ box1_wages: 50000, box13_statutory_employee: true })]);
  assertEquals(fieldsOf(result.outputs, scheduleC)!.statutory_wages, 50000);
  assertEquals(fieldsOf(result.outputs, f1040)!.line1a_wages, undefined);
});

Deno.test("statutory_employee_withholding_included_in_f1040_line25a: withholding still flows to f1040", () => {
  const result = compute([minimalItem({ box1_wages: 50000, box2_fed_withheld: 5000, box13_statutory_employee: true })]);
  assertEquals(fieldsOf(result.outputs, scheduleC)!.statutory_wages, 50000);
  assertEquals(fieldsOf(result.outputs, f1040)!.line25a_w2_withheld, 5000);
});

Deno.test("non_statutory_wages_stay_on_f1040_not_schedule_c: regular W2 does not go to schedule_c", () => {
  const result = compute([minimalItem({ box1_wages: 50000 })]);
  assertEquals(findOutput(result, "schedule_c"), undefined);
  assertEquals(fieldsOf(result.outputs, f1040)!.line1a_wages, 50000);
});

// ============================================================
// 4. Box 12 code routing — exact field values
// ============================================================

Deno.test("box12_code_w_routes_to_form8889: Code W = $2,000 → employer_hsa_contributions = 2000", () => {
  const result = compute([minimalItem({ box1_wages: 60000, box12_entries: [{ code: Box12Code.W, amount: 2000 }] })]);
  assertEquals(fieldsOf(result.outputs, form8889)!.employer_hsa_contributions, 2000);
});

Deno.test("box12_code_h_routes_to_schedule1_line24f: Code H = $1,500 → line24f_501c18d = 1500", () => {
  const result = compute([minimalItem({ box1_wages: 60000, box12_entries: [{ code: Box12Code.H, amount: 1500 }] })]);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line24f_501c18d, 1500);
});

Deno.test("box12_code_t_routes_to_form8839: Code T = $5,000 → adoption_benefits = 5000", () => {
  const result = compute([minimalItem({ box1_wages: 80000, box12_entries: [{ code: Box12Code.T, amount: 5000 }] })]);
  assertEquals(fieldsOf(result.outputs, form8839)!.adoption_benefits, 5000);
});

Deno.test("box12_code_r_routes_to_form8853: Code R = $1,500 → employer_archer_msa = 1500", () => {
  const result = compute([minimalItem({ box1_wages: 50000, box12_entries: [{ code: Box12Code.R, amount: 1500 }] })]);
  assertEquals(fieldsOf(result.outputs, form8853)!.employer_archer_msa, 1500);
});

Deno.test("box12_code_d_routes_to_form8880: Code D = $10,000 → elective_deferrals = 10000", () => {
  const result = compute([minimalItem({ box1_wages: 50000, box12_entries: [{ code: Box12Code.D, amount: 10000 }] })]);
  assertEquals(fieldsOf(result.outputs, form8880)!.elective_deferrals, 10000);
});

Deno.test("box12_code_e_routes_to_form8880: Code E = $8,000 → elective_deferrals = 8000", () => {
  const result = compute([minimalItem({ box1_wages: 50000, box12_entries: [{ code: Box12Code.E, amount: 8000 }] })]);
  assertEquals(fieldsOf(result.outputs, form8880)!.elective_deferrals, 8000);
});

Deno.test("box12_code_g_routes_to_form8880: Code G = $5,000 → elective_deferrals = 5000", () => {
  const result = compute([minimalItem({ box1_wages: 50000, box12_entries: [{ code: Box12Code.G, amount: 5000 }] })]);
  assertEquals(fieldsOf(result.outputs, form8880)!.elective_deferrals, 5000);
});

Deno.test("box12_code_d_e_g_aggregate_to_form8880: D + E + G = 3000 + 2000 + 1000 → elective_deferrals = 6000", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box12_entries: [
      { code: Box12Code.D, amount: 3000 },
      { code: Box12Code.E, amount: 2000 },
      { code: Box12Code.G, amount: 1000 },
    ],
  })]);
  assertEquals(fieldsOf(result.outputs, form8880)!.elective_deferrals, 6000);
});

Deno.test("box12_code_q_routes_to_f1040_line1i_combat_pay: Code Q = $3,000 → line1i_combat_pay = 3000", () => {
  const result = compute([minimalItem({ box1_wages: 30000, box12_entries: [{ code: Box12Code.Q, amount: 3000 }] })]);
  assertEquals(fieldsOf(result.outputs, f1040)!.line1i_combat_pay, 3000);
});

Deno.test("box12_code_k_routes_to_schedule2_golden_parachute: Code K = $1,000 → golden_parachute_excise = 1000", () => {
  const result = compute([minimalItem({ box1_wages: 500000, box12_entries: [{ code: Box12Code.K, amount: 1000 }] })]);
  assertEquals(fieldsOf(result.outputs, schedule2)!.golden_parachute_excise, 1000);
});

Deno.test("box12_code_z_routes_to_schedule2_409a_excise: Code Z = $2,000 → section409a_excise = 2000", () => {
  const result = compute([minimalItem({ box1_wages: 100000, box12_entries: [{ code: Box12Code.Z, amount: 2000 }] })]);
  assertEquals(fieldsOf(result.outputs, schedule2)!.section409a_excise, 2000);
});

Deno.test("box12_code_a_routes_to_schedule2_uncollected_fica: Code A = $300 + Code B = $200 → uncollected_fica = 500", () => {
  const result = compute([minimalItem({
    box1_wages: 30000,
    box12_entries: [{ code: Box12Code.A, amount: 300 }, { code: Box12Code.B, amount: 200 }],
  })]);
  assertEquals(fieldsOf(result.outputs, schedule2)!.uncollected_fica, 500);
});

Deno.test("box12_code_m_n_routes_to_schedule2_uncollected_fica_gtl: M = $200 + N = $100 → uncollected_fica_gtl = 300", () => {
  const result = compute([minimalItem({
    box1_wages: 0,
    box12_entries: [{ code: Box12Code.M, amount: 200 }, { code: Box12Code.N, amount: 100 }],
  })]);
  assertEquals(fieldsOf(result.outputs, schedule2)!.uncollected_fica_gtl, 300);
});

Deno.test("box12_multiple_entries_on_one_w2: D + W + T all route to separate nodes with exact amounts", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box12_entries: [
      { code: Box12Code.D, amount: 5000 },
      { code: Box12Code.W, amount: 2500 },
      { code: Box12Code.T, amount: 3000 },
    ],
  })]);
  assertEquals(fieldsOf(result.outputs, form8880)!.elective_deferrals, 5000);
  assertEquals(fieldsOf(result.outputs, form8889)!.employer_hsa_contributions, 2500);
  assertEquals(fieldsOf(result.outputs, form8839)!.adoption_benefits, 3000);
});

Deno.test("box12_informational_codes_produce_no_routing: codes C, F, J, L, P, S do not create extra outputs", () => {
  const baseline = compute([minimalItem({ box1_wages: 60000 })]);
  const withInfoCodes = compute([minimalItem({
    box1_wages: 60000,
    box12_entries: [
      { code: Box12Code.C, amount: 300 },
      { code: Box12Code.F, amount: 5000 },
      { code: Box12Code.J, amount: 500 },
      { code: Box12Code.L, amount: 200 },
      { code: Box12Code.P, amount: 400 },
      { code: Box12Code.S, amount: 8000 },
    ],
  })]);
  assertEquals(withInfoCodes.outputs.length, baseline.outputs.length);
});

// ============================================================
// 5. Box 14 routing
// ============================================================

Deno.test("box14_sdi_pfml_routes_to_schedule_a: $600 SDI → line_5a_state_income_tax = 600", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box14_entries: [{ description: "CA SDI", amount: 600, is_state_sdi_pfml: true }],
  })]);
  assertEquals(fieldsOf(result.outputs, scheduleA)!.line_5a_state_income_tax, 600);
});

Deno.test("box14_sdi_plus_state_withheld_combined_to_schedule_a: SDI $500 + box17 $3,000 → line_5a = 3500", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box14_entries: [{ description: "CA SDI", amount: 500, is_state_sdi_pfml: true }],
    box17_state_withheld: 3000,
  })]);
  assertEquals(fieldsOf(result.outputs, scheduleA)!.line_5a_state_income_tax, 3500);
});

Deno.test("box17_state_withheld_routes_to_schedule_a: $4,000 state withholding → line_5a_state_income_tax = 4000", () => {
  const result = compute([minimalItem({ box1_wages: 80000, box17_state_withheld: 4000 })]);
  assertEquals(fieldsOf(result.outputs, scheduleA)!.line_5a_state_income_tax, 4000);
});

Deno.test("box19_local_withheld_routes_to_schedule_a: $1,200 local → line_5a_state_income_tax = 1200", () => {
  const result = compute([minimalItem({ box1_wages: 80000, box19_local_withheld: 1200 })]);
  assertEquals(fieldsOf(result.outputs, scheduleA)!.line_5a_state_income_tax, 1200);
});

Deno.test("box14_non_sdi_entry_does_not_route_to_schedule_a: union dues not routed", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box14_entries: [{ description: "Union Dues", amount: 500, is_state_sdi_pfml: false }],
  })]);
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

// ============================================================
// 6. Multi-W2 aggregation
// ============================================================

Deno.test("two_w2s_wages_sum_to_line1a: $30k + $40k = $70,000 on f1040 line1a", () => {
  const result = compute([
    minimalItem({ box1_wages: 30000 }),
    minimalItem({ box1_wages: 40000 }),
  ]);
  assertEquals(fieldsOf(result.outputs, f1040)!.line1a_wages, 70000);
});

Deno.test("two_w2s_withholding_sums_to_line25a: $3k + $2k = $5,000 on f1040 line25a", () => {
  const result = compute([
    minimalItem({ box2_fed_withheld: 3000 }),
    minimalItem({ box2_fed_withheld: 2000 }),
  ]);
  assertEquals(fieldsOf(result.outputs, f1040)!.line25a_w2_withheld, 5000);
});

Deno.test("two_w2s_allocated_tips_aggregate_to_form4137: $1k + $1.5k = $2,500", () => {
  const result = compute([
    minimalItem({ box1_wages: 20000, box8_allocated_tips: 1000 }),
    minimalItem({ box1_wages: 20000, box8_allocated_tips: 1500 }),
  ]);
  assertEquals(fieldsOf(result.outputs, form4137)!.allocated_tips, 2500);
});

Deno.test("two_w2s_dep_care_aggregate_to_form2441: $2k + $1.5k = $3,500", () => {
  const result = compute([
    minimalItem({ box1_wages: 50000, box10_dep_care: 2000 }),
    minimalItem({ box1_wages: 50000, box10_dep_care: 1500 }),
  ]);
  assertEquals(fieldsOf(result.outputs, form2441)!.dep_care_benefits, 3500);
});

Deno.test("two_w2s_code_d_aggregate_to_form8880: $5k + $5k = $10,000 elective_deferrals", () => {
  const result = compute([
    minimalItem({ box1_wages: 50000, box12_entries: [{ code: Box12Code.D, amount: 5000 }] }),
    minimalItem({ box1_wages: 50000, box12_entries: [{ code: Box12Code.D, amount: 5000 }] }),
  ]);
  assertEquals(fieldsOf(result.outputs, form8880)!.elective_deferrals, 10000);
});

Deno.test("two_w2s_code_w_aggregate_to_form8889: $1,200 + $800 = $2,000 employer_hsa_contributions", () => {
  const result = compute([
    minimalItem({ box1_wages: 40000, box12_entries: [{ code: Box12Code.W, amount: 1200 }] }),
    minimalItem({ box1_wages: 40000, box12_entries: [{ code: Box12Code.W, amount: 800 }] }),
  ]);
  assertEquals(fieldsOf(result.outputs, form8889)!.employer_hsa_contributions, 2000);
});

Deno.test("two_w2s_medicare_wages_aggregate_to_form8959: $60k + $60k = $120,000", () => {
  const result = compute([
    minimalItem({ box1_wages: 60000, box5_medicare_wages: 60000, box6_medicare_withheld: 870 }),
    minimalItem({ box1_wages: 60000, box5_medicare_wages: 60000, box6_medicare_withheld: 870 }),
  ]);
  assertEquals(fieldsOf(result.outputs, form8959)!.medicare_wages, 120000);
  assertEquals(fieldsOf(result.outputs, form8959)!.medicare_withheld, 1740);
});

Deno.test("two_w2s_state_withheld_aggregate_to_schedule_a: $2k + $3k = $5,000 line_5a", () => {
  const result = compute([
    minimalItem({ box1_wages: 50000, box17_state_withheld: 2000 }),
    minimalItem({ box1_wages: 50000, box17_state_withheld: 3000 }),
  ]);
  assertEquals(fieldsOf(result.outputs, scheduleA)!.line_5a_state_income_tax, 5000);
});

Deno.test("statutory_regular_mixed_w2s: statutory wages go to schedule_c, regular go to line1a", () => {
  const result = compute([
    minimalItem({ box1_wages: 30000, box2_fed_withheld: 3000, box13_statutory_employee: true }),
    minimalItem({ box1_wages: 50000, box2_fed_withheld: 5000 }),
  ]);
  assertEquals(fieldsOf(result.outputs, scheduleC)!.statutory_wages, 30000);
  assertEquals(fieldsOf(result.outputs, f1040)!.line1a_wages, 50000);
  assertEquals(fieldsOf(result.outputs, f1040)!.line25a_w2_withheld, 8000);
});

// ============================================================
// 7. Excess SS withholding (multiple employers)
// ============================================================

Deno.test("two_employers_at_max_ss_produce_exact_excess_on_schedule3: 2 × $10,918.20 → excess = $10,918.20", () => {
  const result = compute([
    minimalItem({ box1_wages: 176100, box3_ss_wages: 176100, box4_ss_withheld: 10918.20 }),
    minimalItem({ box1_wages: 176100, box3_ss_wages: 176100, box4_ss_withheld: 10918.20 }),
  ]);
  assertEquals(fieldsOf(result.outputs, schedule3)!.line11_excess_ss, 10918.20);
});

Deno.test("single_employer_at_max_ss_no_excess_schedule3: single employer does not produce schedule3", () => {
  const result = compute([
    minimalItem({ box1_wages: 176100, box3_ss_wages: 176100, box4_ss_withheld: 10918.20 }),
  ]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("two_employers_partial_ss_withholding_no_excess: $5k + $5k < max → no schedule3", () => {
  const result = compute([
    minimalItem({ box1_wages: 80000, box3_ss_wages: 80000, box4_ss_withheld: 5000 }),
    minimalItem({ box1_wages: 80000, box3_ss_wages: 80000, box4_ss_withheld: 5000 }),
  ]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ============================================================
// 8. SS/Medicare validation boundaries
// ============================================================

Deno.test("ss_wage_base_exactly_at_limit_is_valid: $176,100 does not throw and wages route to f1040", () => {
  // box4_ss_withheld is SS payroll tax — it does NOT flow to line25a (that's box2 federal income tax)
  const result = compute([minimalItem({ box1_wages: 176100, box3_ss_wages: 176100, box4_ss_withheld: 10918.20 })]);
  assertEquals(fieldsOf(result.outputs, f1040)!.line1a_wages, 176100);
});

Deno.test("ss_wage_base_exceeded_throws: $176,101 throws", () => {
  assertThrows(
    () => compute([minimalItem({ box1_wages: 176101, box3_ss_wages: 176101, box4_ss_withheld: 10918.26 })]),
    Error,
  );
});

Deno.test("ss_tax_withheld_above_per_employer_max_throws: $10,918.21 throws", () => {
  assertThrows(
    () => compute([minimalItem({ box1_wages: 176100, box3_ss_wages: 176100, box4_ss_withheld: 10918.21 })]),
    Error,
  );
});

// ============================================================
// 9. Retirement plan deferral limits (throws above, passes at)
// ============================================================

Deno.test("401k_under50_at_limit_valid: age 40, D + AA = $23,500 is valid → form8880 receives only D amount", () => {
  // AA (Roth 401k) is counted against the 401k limit but only D routes to form8880 elective_deferrals
  const result = compute([minimalItem({
    box1_wages: 80000,
    box12_entries: [{ code: Box12Code.D, amount: 15000 }, { code: Box12Code.AA, amount: 8500 }],
    taxpayer_age: 40,
  })]);
  assertEquals(fieldsOf(result.outputs, form8880)!.elective_deferrals, 15000);
});

Deno.test("401k_under50_above_limit_throws: age 40, D + AA = $23,501 throws", () => {
  assertThrows(
    () => compute([minimalItem({
      box1_wages: 80000,
      box12_entries: [{ code: Box12Code.D, amount: 20000 }, { code: Box12Code.AA, amount: 3501 }],
      taxpayer_age: 40,
    })]),
    Error,
  );
});

Deno.test("401k_age50_59_at_limit_valid: age 55, D = $31,000 is valid → elective_deferrals = 31000", () => {
  const result = compute([minimalItem({
    box1_wages: 150000,
    box12_entries: [{ code: Box12Code.D, amount: 31000 }],
    taxpayer_age: 55,
  })]);
  assertEquals(fieldsOf(result.outputs, form8880)!.elective_deferrals, 31000);
});

Deno.test("401k_age50_59_above_limit_throws: age 55, D = $31,001 throws", () => {
  assertThrows(
    () => compute([minimalItem({
      box1_wages: 150000,
      box12_entries: [{ code: Box12Code.D, amount: 31001 }],
      taxpayer_age: 55,
    })]),
    Error,
  );
});

Deno.test("401k_age60_63_super_catchup_at_limit_valid: age 62, D + AA = $34,750 is valid → form8880 receives only D amount", () => {
  // AA (Roth) counted against limit but not routed to form8880; only D routes
  const result = compute([minimalItem({
    box1_wages: 200000,
    box12_entries: [{ code: Box12Code.D, amount: 23500 }, { code: Box12Code.AA, amount: 11250 }],
    taxpayer_age: 62,
  })]);
  assertEquals(fieldsOf(result.outputs, form8880)!.elective_deferrals, 23500);
});

Deno.test("401k_age60_63_above_super_catchup_throws: age 62, D + AA = $34,751 throws", () => {
  assertThrows(
    () => compute([minimalItem({
      box1_wages: 200000,
      box12_entries: [{ code: Box12Code.D, amount: 23500 }, { code: Box12Code.AA, amount: 11251 }],
      taxpayer_age: 62,
    })]),
    Error,
  );
});

Deno.test("403b_under50_above_limit_throws: age 40, E + BB = $23,501 throws", () => {
  assertThrows(
    () => compute([minimalItem({
      box1_wages: 80000,
      box12_entries: [{ code: Box12Code.E, amount: 20000 }, { code: Box12Code.BB, amount: 3501 }],
      taxpayer_age: 40,
    })]),
    Error,
  );
});

Deno.test("403b_age60_63_at_limit_valid: age 61, E + BB = $34,750 → form8880 receives only E amount", () => {
  // BB (Roth 403b) counted against limit but not routed to form8880; only E routes
  const result = compute([minimalItem({
    box1_wages: 200000,
    box12_entries: [{ code: Box12Code.E, amount: 23500 }, { code: Box12Code.BB, amount: 11250 }],
    taxpayer_age: 61,
  })]);
  assertEquals(fieldsOf(result.outputs, form8880)!.elective_deferrals, 23500);
});

Deno.test("457b_under50_above_limit_throws: age 40, G + EE = $23,501 throws", () => {
  assertThrows(
    () => compute([minimalItem({
      box1_wages: 80000,
      box12_entries: [{ code: Box12Code.G, amount: 20000 }, { code: Box12Code.EE, amount: 3501 }],
      taxpayer_age: 40,
    })]),
    Error,
  );
});

Deno.test("simple_ira_under50_at_limit_valid: age 40, S = $16,500 → no route but no error", () => {
  // Code S is informational (SIMPLE IRA) — validated but not routed
  const result = compute([minimalItem({
    box1_wages: 60000,
    box12_entries: [{ code: Box12Code.S, amount: 16500 }],
    taxpayer_age: 40,
  })]);
  assertEquals(fieldsOf(result.outputs, f1040)!.line1a_wages, 60000);
});

Deno.test("simple_ira_under50_above_limit_throws: age 40, S = $16,501 throws", () => {
  assertThrows(
    () => compute([minimalItem({
      box1_wages: 60000,
      box12_entries: [{ code: Box12Code.S, amount: 16501 }],
      taxpayer_age: 40,
    })]),
    Error,
  );
});

Deno.test("simple_ira_age60_63_at_super_catchup_valid: age 62, S = $21,750 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 60000,
    box12_entries: [{ code: Box12Code.S, amount: 21750 }],
    taxpayer_age: 62,
  })]);
  assertEquals(fieldsOf(result.outputs, f1040)!.line1a_wages, 60000);
});

Deno.test("simple_ira_age60_63_above_super_catchup_throws: age 62, S = $21,751 throws", () => {
  assertThrows(
    () => compute([minimalItem({
      box1_wages: 60000,
      box12_entries: [{ code: Box12Code.S, amount: 21751 }],
      taxpayer_age: 62,
    })]),
    Error,
  );
});

// ============================================================
// 10. Warning-only rules (no throws)
// ============================================================

Deno.test("ss_rate_mismatch_is_warning_only_not_error: Box 3 = $50k, Box 4 = $3,050 still computes", () => {
  const result = compute([minimalItem({ box1_wages: 50000, box3_ss_wages: 50000, box4_ss_withheld: 3050 })]);
  assertEquals(fieldsOf(result.outputs, f1040)!.line1a_wages, 50000);
});

Deno.test("dep_care_above_5000_is_warning_only: Box 10 = $5,001 still routes to form2441", () => {
  const result = compute([minimalItem({ box1_wages: 80000, box10_dep_care: 5001 })]);
  assertEquals(fieldsOf(result.outputs, form2441)!.dep_care_benefits, 5001);
});

// ============================================================
// 11. Smoke test
// ============================================================

Deno.test("comprehensive_w2_full_workflow: two W-2s with all major boxes populate all expected outputs with exact values", () => {
  const result = compute([
    minimalItem({
      box1_wages: 75000,
      box2_fed_withheld: 8000,
      box5_medicare_wages: 75000,
      box6_medicare_withheld: 1087.50,
      box8_allocated_tips: 500,
      box10_dep_care: 3000,
      box12_entries: [
        { code: Box12Code.D, amount: 8000 },
        { code: Box12Code.W, amount: 2000 },
        { code: Box12Code.T, amount: 3000 },
        { code: Box12Code.R, amount: 1200 },
      ],
      box13_retirement_plan: true,
      box14_entries: [{ description: "CA SDI", amount: 400, is_state_sdi_pfml: true }],
      box17_state_withheld: 5000,
      taxpayer_age: 45,
    }),
    minimalItem({
      box1_wages: 25000,
      box2_fed_withheld: 2500,
      box5_medicare_wages: 25000,
      box6_medicare_withheld: 362.50,
      box12_entries: [{ code: Box12Code.W, amount: 500 }],
    }),
  ]);

  // f1040 wages: 75000 + 25000
  assertEquals(fieldsOf(result.outputs, f1040)!.line1a_wages, 100000);
  // f1040 withholding: 8000 + 2500
  assertEquals(fieldsOf(result.outputs, f1040)!.line25a_w2_withheld, 10500);
  // form8959 medicare wages aggregated
  assertEquals(fieldsOf(result.outputs, form8959)!.medicare_wages, 100000);
  // form4137 allocated tips
  assertEquals(fieldsOf(result.outputs, form4137)!.allocated_tips, 500);
  // form2441 dep care
  assertEquals(fieldsOf(result.outputs, form2441)!.dep_care_benefits, 3000);
  // form8889 HSA: 2000 + 500
  assertEquals(fieldsOf(result.outputs, form8889)!.employer_hsa_contributions, 2500);
  // form8839 adoption
  assertEquals(fieldsOf(result.outputs, form8839)!.adoption_benefits, 3000);
  // form8853 archer MSA
  assertEquals(fieldsOf(result.outputs, form8853)!.employer_archer_msa, 1200);
  // form8880 elective deferrals
  assertEquals(fieldsOf(result.outputs, form8880)!.elective_deferrals, 8000);
  // IRA worksheet
  assertEquals(fieldsOf(result.outputs, ira_deduction_worksheet)!.covered_by_retirement_plan, true);
  // schedule_a: SDI $400 + state $5,000
  assertEquals(fieldsOf(result.outputs, scheduleA)!.line_5a_state_income_tax, 5400);
});
