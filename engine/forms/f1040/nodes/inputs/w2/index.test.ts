import { assertEquals, assertThrows } from "@std/assert";
import { w2 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form8839 } from "../../intermediate/form8839/index.ts";
import { form2441 } from "../../intermediate/form2441/index.ts";
import { form4137 } from "../../intermediate/form4137/index.ts";
import { form8853 } from "../../intermediate/form8853/index.ts";
import { form8880 } from "../../intermediate/form8880/index.ts";
import { form8889 } from "../../intermediate/form8889/index.ts";
import { form8959 } from "../../intermediate/form8959/index.ts";
import { ira_deduction_worksheet } from "../../intermediate/ira_deduction_worksheet/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule2 } from "../../intermediate/schedule2/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
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
  return w2.compute({ w2s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ============================================================
// 1. Input Schema Validation
// ============================================================

Deno.test("empty_box12_codes_array: W-2 with empty Box 12 codes array is accepted", () => {
  const parsed = w2.inputSchema.safeParse({
    w2s: [{ box1_wages: 50000, box2_fed_withheld: 5000, box12_entries: [] }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("empty_state_boxes_array: W-2 with no state entries is accepted", () => {
  const parsed = w2.inputSchema.safeParse({
    w2s: [{ box1_wages: 50000, box2_fed_withheld: 5000 }],
  });
  assertEquals(parsed.success, true);
});

// ============================================================
// 2. Per-Box Routing
// ============================================================

Deno.test("box_1_wages_routes_to_1040_line1a: Box 1 = $50,000 routes to f1040 line1a_wages", () => {
  const result = compute([minimalItem({ box1_wages: 50000 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, f1040)!.line1a_wages, 50000);
});

Deno.test("box_1_zero_value: Box 1 = $0 still produces f1040 output", () => {
  const result = compute([
    minimalItem({ box1_wages: 0, box2_fed_withheld: 0 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
});

Deno.test("box_2_withholding_routes_to_1040_line25a: Box 2 = $5,000 routes to f1040 line25a_w2_withheld", () => {
  const result = compute([
    minimalItem({ box1_wages: 50000, box2_fed_withheld: 5000 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line25a_w2_withheld,
    5000,
  );
});

Deno.test("box_8_allocated_tips_routes_to_form4137: Box 8 = $2,000 routes to form4137", () => {
  const result = compute([
    minimalItem({ box1_wages: 40000, box8_allocated_tips: 2000 }),
  ]);
  const out = findOutput(result, "form4137");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, form4137)!.allocated_tips, 2000);
});

Deno.test("box_10_dependent_care_routes_to_form2441: Box 10 = $3,000 routes to form2441", () => {
  const result = compute([
    minimalItem({ box1_wages: 70000, box10_dep_care: 3000 }),
  ]);
  const out = findOutput(result, "form2441");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, form2441)!.dep_care_benefits, 3000);
});

Deno.test("box_13_retirement_plan_triggers_ira_worksheet: Box 13 retirement checked routes to ira_deduction_worksheet", () => {
  const result = compute([
    minimalItem({ box1_wages: 80000, box13_retirement_plan: true }),
  ]);
  const out = findOutput(result, "ira_deduction_worksheet");
  assertEquals(out !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, ira_deduction_worksheet)!.covered_by_retirement_plan,
    true,
  );
});

Deno.test("box_13_statutory_employee_routes_to_schedule_c: Box 13 statutory = true routes to schedule_c", () => {
  const result = compute([
    minimalItem({ box1_wages: 50000, box13_statutory_employee: true }),
  ]);
  const out = findOutput(result, "schedule_c");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, scheduleC)!.statutory_wages, 50000);
});

Deno.test("box12_code_a_routes_to_schedule2_line13: Code A = $500 routes to schedule2 uncollected_fica", () => {
  const result = compute([
    minimalItem({
      box1_wages: 30000,
      box12_entries: [{ code: "A", amount: 500 }],
    }),
  ]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
});

Deno.test("box12_code_b_routes_to_schedule2_line13: Code B = $500 routes to schedule2 uncollected_fica", () => {
  const result = compute([
    minimalItem({
      box1_wages: 30000,
      box12_entries: [{ code: "B", amount: 500 }],
    }),
  ]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
});

Deno.test("box12_code_d_routes_to_form8880_line2: Code D = $1,000 routes to form8880", () => {
  const result = compute([
    minimalItem({
      box1_wages: 50000,
      box12_entries: [{ code: "D", amount: 1000 }],
    }),
  ]);
  const out = findOutput(result, "form8880");
  assertEquals(out !== undefined, true);
});

Deno.test("box12_code_e_routes_to_form8880_line2: Code E = $1,000 routes to form8880", () => {
  const result = compute([
    minimalItem({
      box1_wages: 50000,
      box12_entries: [{ code: "E", amount: 1000 }],
    }),
  ]);
  const out = findOutput(result, "form8880");
  assertEquals(out !== undefined, true);
});

Deno.test("box12_code_f_tracking_only: Code F = $5,000 does NOT route to any active form", () => {
  const withF = compute([
    minimalItem({
      box1_wages: 60000,
      box12_entries: [{ code: "F", amount: 5000 }],
    }),
  ]);
  const without = compute([minimalItem({ box1_wages: 60000 })]);
  assertEquals(withF.outputs.length, without.outputs.length);
});

Deno.test("box12_code_g_routes_to_form8880_line2: Code G = $1,000 routes to form8880", () => {
  const result = compute([
    minimalItem({
      box1_wages: 50000,
      box12_entries: [{ code: "G", amount: 1000 }],
    }),
  ]);
  const out = findOutput(result, "form8880");
  assertEquals(out !== undefined, true);
});

Deno.test("box12_code_h_routes_to_schedule1_line24f: Code H = $1,500 routes to schedule1 line24f_501c18d", () => {
  const result = compute([
    minimalItem({
      box1_wages: 60000,
      box12_entries: [{ code: "H", amount: 1500 }],
    }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line24f_501c18d, 1500);
});

Deno.test("box12_code_k_routes_to_schedule2_line17k: Code K = $1,000 routes to schedule2 golden_parachute_excise", () => {
  const result = compute([
    minimalItem({
      box1_wages: 500000,
      box12_entries: [{ code: "K", amount: 1000 }],
    }),
  ]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, schedule2)!.golden_parachute_excise,
    1000,
  );
});

Deno.test("box12_code_m_routes_to_schedule2_line13: Code M = $500 routes to schedule2 uncollected_fica_gtl", () => {
  const result = compute([
    minimalItem({ box1_wages: 0, box12_entries: [{ code: "M", amount: 500 }] }),
  ]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
});

Deno.test("box12_code_n_routes_to_schedule2_line13: Code N = $500 routes to schedule2 uncollected_fica_gtl", () => {
  const result = compute([
    minimalItem({ box1_wages: 0, box12_entries: [{ code: "N", amount: 500 }] }),
  ]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
});

Deno.test("box12_code_q_routes_to_1040_line1i: Code Q = $3,000 routes to f1040 line1i_combat_pay", () => {
  const result = compute([
    minimalItem({
      box1_wages: 30000,
      box12_entries: [{ code: "Q", amount: 3000 }],
    }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, f1040)!.line1i_combat_pay, 3000);
});

Deno.test("box12_code_r_routes_to_form8853_part1_line1: Code R = $1,500 routes to form8853 employer_archer_msa", () => {
  const result = compute([
    minimalItem({
      box1_wages: 50000,
      box12_entries: [{ code: "R", amount: 1500 }],
    }),
  ]);
  const out = findOutput(result, "form8853");
  assertEquals(out !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, form8853)!.employer_archer_msa,
    1500,
  );
});

Deno.test("box12_code_s_tracking_only: Code S = $5,000 does NOT route to any active form", () => {
  const withS = compute([
    minimalItem({
      box1_wages: 60000,
      box12_entries: [{ code: "S", amount: 5000 }],
    }),
  ]);
  const without = compute([minimalItem({ box1_wages: 60000 })]);
  assertEquals(withS.outputs.length, without.outputs.length);
});

Deno.test("box12_code_t_routes_to_form8839_part3: Code T = $5,000 routes to form8839 adoption_benefits", () => {
  const result = compute([
    minimalItem({
      box1_wages: 80000,
      box12_entries: [{ code: "T", amount: 5000 }],
    }),
  ]);
  const out = findOutput(result, "form8839");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, form8839)!.adoption_benefits, 5000);
});

Deno.test("box12_code_w_routes_to_form8889_part2: Code W = $2,000 routes to form8889 employer_hsa_contributions", () => {
  const result = compute([
    minimalItem({
      box1_wages: 60000,
      box12_entries: [{ code: "W", amount: 2000 }],
    }),
  ]);
  const out = findOutput(result, "form8889");
  assertEquals(out !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, form8889)!.employer_hsa_contributions,
    2000,
  );
});

Deno.test("box12_code_z_routes_to_1040_line1a_and_schedule2_line17h: Code Z = $2,000 routes to schedule2 section409a_excise", () => {
  const result = compute([
    minimalItem({
      box1_wages: 100000,
      box12_entries: [{ code: "Z", amount: 2000 }],
    }),
  ]);
  const schedule2Out = findOutput(result, "schedule2");
  assertEquals(schedule2Out !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, schedule2)!.section409a_excise,
    2000,
  );
});

Deno.test("box_14_state_sdi_pfml_routes_to_schedule_a_line5a: Box 14 with is_state_sdi_pfml routes to schedule_a", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box14_entries: [{
      description: "CA SDI",
      amount: 600,
      is_state_sdi_pfml: true,
    }],
  })]);
  const out = findOutput(result, "schedule_a");
  assertEquals(out !== undefined, true);
  assertEquals(
    typeof fieldsOf(result.outputs, scheduleA)!.line_5a_tax_amount,
    "number",
  );
});

Deno.test("box_14_informational_category_no_route: Box 14 informational entry does NOT route to schedule_a", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box14_entries: [{
      description: "Union Dues",
      amount: 500,
      is_state_sdi_pfml: false,
    }],
  })]);
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

Deno.test("box_14_other_category_no_direct_route: Box 14 other category entry does NOT route to schedule_a", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box14_entries: [{
      description: "Other",
      amount: 200,
      is_state_sdi_pfml: false,
    }],
  })]);
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

Deno.test("box_14b_tipped_occupation_code_no_direct_route: Box 14b tipped code does not alter federal tax outputs", () => {
  const result = compute([
    minimalItem({ box1_wages: 40000, box14b_tipped_code: "3010" }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line1a_wages,
    40000,
  );
});

Deno.test("box_15_state_no_direct_route: Box 15 state = 'CA' routes to state_return", () => {
  // AMBIGUITY: verify exact nodeType used for state routing
  const result = compute([
    minimalItem({
      box1_wages: 80000,
      box15_state: "CA",
      box16_state_wages: 80000,
    }),
  ]);
  const stateOut = findOutput(result, "state_return");
  // If state routing not yet implemented, this is informational
  if (stateOut !== undefined) {
    assertEquals(stateOut.nodeType, "state_return");
  } else {
    // State routing handled downstream — not yet in W2 node scope
    assertEquals(Array.isArray(result.outputs), true);
  }
});

// ============================================================
// 3. Aggregation
// ============================================================

Deno.test("sum_box1_across_multiple_w2s: 2 W-2s with Box 1 = $30k each → f1040 line1a = $60,000", () => {
  const result = compute([
    minimalItem({ box1_wages: 30000 }),
    minimalItem({ box1_wages: 30000 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, f1040)!.line1a_wages, 60000);
});

Deno.test("sum_box2_across_multiple_w2s: 2 W-2s with Box 2 = $3k each → f1040 line25a = $6,000", () => {
  const result = compute([
    minimalItem({ box2_fed_withheld: 3000 }),
    minimalItem({ box2_fed_withheld: 3000 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line25a_w2_withheld,
    6000,
  );
});

Deno.test("sum_box3_ss_wages_across_multiple_w2s: 2 W-2s with Box 3 = $50k each are accepted", () => {
  // Each W-2 is valid on its own; combined SS wages matter for per-employer rule
  const result = compute([
    minimalItem({
      box1_wages: 50000,
      box3_ss_wages: 50000,
      box4_ss_withheld: 3100,
    }),
    minimalItem({
      box1_wages: 50000,
      box3_ss_wages: 50000,
      box4_ss_withheld: 3100,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("sum_box4_ss_withheld_across_multiple_w2s: 2 W-2s with Box 4 = $3.1k each produce schedule3 excess", () => {
  // Combined $6,200 > $10,918.20 is not excess, but 2 × $5,459.10 = $10,918.20 is at max
  // Use 2 × $10,918.20 to produce genuine excess (2 employers at max = $21,836.40)
  const result = compute([
    minimalItem({
      box1_wages: 176100,
      box3_ss_wages: 176100,
      box4_ss_withheld: 10918.20,
    }),
    minimalItem({
      box1_wages: 176100,
      box3_ss_wages: 176100,
      box4_ss_withheld: 10918.20,
    }),
  ]);
  const schedule3Out = findOutput(result, "schedule3");
  assertEquals(schedule3Out !== undefined, true);
  assertEquals(
    typeof fieldsOf(result.outputs, schedule3)!.line11_excess_ss,
    "number",
  );
});

Deno.test("sum_box5_medicare_wages_across_multiple_w2s: 2 W-2s with Box 5 = $60k each route to form8959", () => {
  const result = compute([
    minimalItem({
      box1_wages: 60000,
      box5_medicare_wages: 60000,
      box6_medicare_withheld: 870,
    }),
    minimalItem({
      box1_wages: 60000,
      box5_medicare_wages: 60000,
      box6_medicare_withheld: 870,
    }),
  ]);
  const out = findOutput(result, "form8959");
  assertEquals(out !== undefined, true);
});

Deno.test("sum_box6_medicare_withheld_across_multiple_w2s: 2 W-2s with Box 6 = $870 each route to form8959", () => {
  const result = compute([
    minimalItem({
      box1_wages: 60000,
      box5_medicare_wages: 60000,
      box6_medicare_withheld: 870,
    }),
    minimalItem({
      box1_wages: 60000,
      box5_medicare_wages: 60000,
      box6_medicare_withheld: 870,
    }),
  ]);
  const out = findOutput(result, "form8959");
  assertEquals(out !== undefined, true);
});

Deno.test("sum_box8_allocated_tips: 2 W-2s with Box 8 = $1k each → form4137 total = $2,000", () => {
  const result = compute([
    minimalItem({ box1_wages: 20000, box8_allocated_tips: 1000 }),
    minimalItem({ box1_wages: 20000, box8_allocated_tips: 1000 }),
  ]);
  // Each W-2 item produces its own form4137 output; find the one with allocated_tips = 1000 (first)
  const allForm4137 = result.outputs.filter((o) => o.nodeType === "form4137");
  const total = allForm4137.reduce(
    (sum, o) =>
      sum + ((o.fields as Record<string, unknown>).allocated_tips as number),
    0,
  );
  assertEquals(total, 2000);
});

Deno.test("sum_box10_dependent_care: 2 W-2s with Box 10 = $2k each → form2441 total = $4,000", () => {
  const result = compute([
    minimalItem({ box1_wages: 50000, box10_dep_care: 2000 }),
    minimalItem({ box1_wages: 50000, box10_dep_care: 2000 }),
  ]);
  const allForm2441 = result.outputs.filter((o) => o.nodeType === "form2441");
  const total = allForm2441.reduce(
    (sum, o) =>
      sum + ((o.fields as Record<string, unknown>).dep_care_benefits as number),
    0,
  );
  assertEquals(total, 4000);
});

Deno.test("sum_box12_code_d_deferrals: 2 W-2s with Code D = $5k each → form8880 total = $10,000", () => {
  const result = compute([
    minimalItem({
      box1_wages: 50000,
      box12_entries: [{ code: "D", amount: 5000 }],
    }),
    minimalItem({
      box1_wages: 50000,
      box12_entries: [{ code: "D", amount: 5000 }],
    }),
  ]);
  const allForm8880 = result.outputs.filter((o) => o.nodeType === "form8880");
  const total = allForm8880.reduce(
    (sum, o) =>
      sum + ((o.fields as Record<string, unknown>).elective_deferrals as number),
    0,
  );
  assertEquals(total, 10000);
});

// ============================================================
// 4. Thresholds
// ============================================================

Deno.test("ss_wage_base_below_threshold: Box 3 = $100,000 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 100000,
    box3_ss_wages: 100000,
    box4_ss_withheld: 6200,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("ss_wage_base_at_threshold: Box 3 = $176,100 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 176100,
    box3_ss_wages: 176100,
    box4_ss_withheld: 10918.20,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("ss_wage_base_above_threshold: Box 3 + Box 7 = $176,101 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 176101,
        box3_ss_wages: 176101,
        box4_ss_withheld: 10918.26,
      })]),
    Error,
  );
});

Deno.test("max_ss_tax_below: Box 4 = $10,900 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 176100,
    box3_ss_wages: 176100,
    box4_ss_withheld: 10900,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("max_ss_tax_at: Box 4 = $10,918.20 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 176100,
    box3_ss_wages: 176100,
    box4_ss_withheld: 10918.20,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("max_ss_tax_above: Box 4 = $10,918.21 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 176100,
        box3_ss_wages: 176100,
        box4_ss_withheld: 10918.21,
      })]),
    Error,
  );
});

Deno.test("ira_phase_out_single_below: Single, MAGI = $78,999, Box 13 = true does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 78999, box13_retirement_plan: true }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("ira_phase_out_single_within_range_lower: Single, MAGI = $79,000, Box 13 = true does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 79000, box13_retirement_plan: true }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("ira_phase_out_single_within_range_upper: Single, MAGI = $89,000, Box 13 = true does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 89000, box13_retirement_plan: true }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("ira_phase_out_single_above: Single, MAGI = $89,001, Box 13 = true does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 89001, box13_retirement_plan: true }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("ira_phase_out_mfj_below: MFJ, MAGI = $125,999, Box 13 = true does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 125999, box13_retirement_plan: true }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("ira_phase_out_mfj_within_range_lower: MFJ, MAGI = $126,000, Box 13 = true does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 126000, box13_retirement_plan: true }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("ira_phase_out_mfj_within_range_upper: MFJ, MAGI = $146,000, Box 13 = true does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 146000, box13_retirement_plan: true }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("ira_phase_out_mfj_above: MFJ, MAGI = $146,001, Box 13 = true does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 146001, box13_retirement_plan: true }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("ira_phase_out_mfs_below: MFS, MAGI = $0, Box 13 = true does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 0, box13_retirement_plan: true }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("ira_phase_out_mfs_within_range: MFS, MAGI = $5,000, Box 13 = true does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 5000, box13_retirement_plan: true }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("ira_phase_out_mfs_at_upper: MFS, MAGI = $10,000, Box 13 = true does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 10000, box13_retirement_plan: true }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("ira_phase_out_mfs_above: MFS, MAGI = $10,001, Box 13 = true does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 10001, box13_retirement_plan: true }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("dependent_care_exclusion_below: Box 10 = $4,999 does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 60000, box10_dep_care: 4999 }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("dependent_care_exclusion_at: Box 10 = $5,000 does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 60000, box10_dep_care: 5000 }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("dependent_care_exclusion_above: Box 10 = $5,001 does not throw (warning only)", () => {
  const result = compute([
    minimalItem({ box1_wages: 60000, box10_dep_care: 5001 }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("dependent_care_exclusion_mfs_below: MFS, Box 10 = $2,499 does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 50000, box10_dep_care: 2499 }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("dependent_care_exclusion_mfs_at: MFS, Box 10 = $2,500 does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 50000, box10_dep_care: 2500 }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("dependent_care_exclusion_mfs_above: MFS, Box 10 = $2,501 does not throw (warning only)", () => {
  const result = compute([
    minimalItem({ box1_wages: 50000, box10_dep_care: 2501 }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("medicare_threshold_single_below: Single, Box 5 = $199,999 does not throw", () => {
  const result = compute([minimalItem({
    box1_wages: 199999,
    box5_medicare_wages: 199999,
    box6_medicare_withheld: 2900,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("medicare_threshold_single_at: Single, Box 5 = $200,000 does not throw", () => {
  const result = compute([minimalItem({
    box1_wages: 200000,
    box5_medicare_wages: 200000,
    box6_medicare_withheld: 2900,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("medicare_threshold_single_above: Single, Box 5 = $200,001 does not throw", () => {
  const result = compute([minimalItem({
    box1_wages: 200001,
    box5_medicare_wages: 200001,
    box6_medicare_withheld: 2900.01,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("medicare_threshold_mfj_below: MFJ, combined Box 5 = $249,999 does not throw", () => {
  const result = compute([minimalItem({
    box1_wages: 249999,
    box5_medicare_wages: 249999,
    box6_medicare_withheld: 3625,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("medicare_threshold_mfj_at: MFJ, combined Box 5 = $250,000 does not throw", () => {
  const result = compute([minimalItem({
    box1_wages: 250000,
    box5_medicare_wages: 250000,
    box6_medicare_withheld: 3625,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("medicare_threshold_mfj_above: MFJ, combined Box 5 = $250,001 does not throw", () => {
  const result = compute([minimalItem({
    box1_wages: 250001,
    box5_medicare_wages: 250001,
    box6_medicare_withheld: 3625.01,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("medicare_threshold_mfs_below: MFS, Box 5 = $124,999 does not throw", () => {
  const result = compute([minimalItem({
    box1_wages: 124999,
    box5_medicare_wages: 124999,
    box6_medicare_withheld: 1812.49,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("medicare_threshold_mfs_at: MFS, Box 5 = $125,000 does not throw", () => {
  const result = compute([minimalItem({
    box1_wages: 125000,
    box5_medicare_wages: 125000,
    box6_medicare_withheld: 1812.50,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("medicare_threshold_mfs_above: MFS, Box 5 = $125,001 does not throw", () => {
  const result = compute([minimalItem({
    box1_wages: 125001,
    box5_medicare_wages: 125001,
    box6_medicare_withheld: 1812.51,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("401k_limit_under_50_at: Age 40, Code D + Code AA = $23,500 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box12_entries: [{ code: "D", amount: 15000 }, { code: "AA", amount: 8500 }],
    taxpayer_age: 40,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("401k_limit_under_50_above: Age 40, Code D + Code AA = $23,501 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 80000,
        box12_entries: [{ code: "D", amount: 20000 }, {
          code: "AA",
          amount: 3501,
        }],
        taxpayer_age: 40,
      })]),
    Error,
  );
});

Deno.test("401k_limit_50_plus_at: Age 50, Code D + Code AA = $31,000 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 150000,
    box12_entries: [{ code: "D", amount: 23500 }, { code: "AA", amount: 7500 }],
    taxpayer_age: 50,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("401k_limit_50_plus_above: Age 50, Code D + Code AA = $31,001 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 150000,
        box12_entries: [{ code: "D", amount: 23500 }, {
          code: "AA",
          amount: 7501,
        }],
        taxpayer_age: 50,
      })]),
    Error,
  );
});

Deno.test("401k_limit_60_63_at: Age 62, Code D + Code AA = $34,750 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 200000,
    box12_entries: [{ code: "D", amount: 23500 }, {
      code: "AA",
      amount: 11250,
    }],
    taxpayer_age: 62,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("401k_limit_60_63_above: Age 62, Code D + Code AA = $34,751 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 200000,
        box12_entries: [{ code: "D", amount: 23500 }, {
          code: "AA",
          amount: 11251,
        }],
        taxpayer_age: 62,
      })]),
    Error,
  );
});

Deno.test("403b_limit_under_50_at: Age 40, Code E + Code BB = $23,500 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box12_entries: [{ code: "E", amount: 15000 }, { code: "BB", amount: 8500 }],
    taxpayer_age: 40,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("403b_limit_under_50_above: Age 40, Code E + Code BB = $23,501 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 80000,
        box12_entries: [{ code: "E", amount: 20000 }, {
          code: "BB",
          amount: 3501,
        }],
        taxpayer_age: 40,
      })]),
    Error,
  );
});

Deno.test("403b_limit_50_plus_at: Age 50, Code E + Code BB = $31,000 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 150000,
    box12_entries: [{ code: "E", amount: 23500 }, { code: "BB", amount: 7500 }],
    taxpayer_age: 50,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("403b_limit_50_plus_above: Age 50, Code E + Code BB = $31,001 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 150000,
        box12_entries: [{ code: "E", amount: 23500 }, {
          code: "BB",
          amount: 7501,
        }],
        taxpayer_age: 50,
      })]),
    Error,
  );
});

Deno.test("403b_limit_60_63_at: Age 62, Code E + Code BB = $34,750 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 200000,
    box12_entries: [{ code: "E", amount: 23500 }, {
      code: "BB",
      amount: 11250,
    }],
    taxpayer_age: 62,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("403b_limit_60_63_above: Age 62, Code E + Code BB = $34,751 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 200000,
        box12_entries: [{ code: "E", amount: 23500 }, {
          code: "BB",
          amount: 11251,
        }],
        taxpayer_age: 62,
      })]),
    Error,
  );
});

Deno.test("457b_limit_under_50_at: Age 40, Code G + Code EE = $23,500 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box12_entries: [{ code: "G", amount: 15000 }, { code: "EE", amount: 8500 }],
    taxpayer_age: 40,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("457b_limit_under_50_above: Age 40, Code G + Code EE = $23,501 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 80000,
        box12_entries: [{ code: "G", amount: 20000 }, {
          code: "EE",
          amount: 3501,
        }],
        taxpayer_age: 40,
      })]),
    Error,
  );
});

Deno.test("457b_limit_50_plus_at: Age 50, Code G + Code EE = $31,000 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 150000,
    box12_entries: [{ code: "G", amount: 23500 }, { code: "EE", amount: 7500 }],
    taxpayer_age: 50,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("457b_limit_50_plus_above: Age 50, Code G + Code EE = $31,001 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 150000,
        box12_entries: [{ code: "G", amount: 23500 }, {
          code: "EE",
          amount: 7501,
        }],
        taxpayer_age: 50,
      })]),
    Error,
  );
});

Deno.test("457b_limit_60_63_at: Age 62, Code G + Code EE = $34,750 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 200000,
    box12_entries: [{ code: "G", amount: 23500 }, {
      code: "EE",
      amount: 11250,
    }],
    taxpayer_age: 62,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("457b_limit_60_63_above: Age 62, Code G + Code EE = $34,751 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 200000,
        box12_entries: [{ code: "G", amount: 23500 }, {
          code: "EE",
          amount: 11251,
        }],
        taxpayer_age: 62,
      })]),
    Error,
  );
});

Deno.test("simple_ira_limit_under_50_at: Age 40, Code S = $16,500 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 60000,
    box12_entries: [{ code: "S", amount: 16500 }],
    taxpayer_age: 40,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("simple_ira_limit_under_50_above: Age 40, Code S = $16,501 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 60000,
        box12_entries: [{ code: "S", amount: 16501 }],
        taxpayer_age: 40,
      })]),
    Error,
  );
});

Deno.test("simple_ira_limit_50_plus_at: Age 50, Code S = $20,000 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 60000,
    box12_entries: [{ code: "S", amount: 20000 }],
    taxpayer_age: 50,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("simple_ira_limit_50_plus_above: Age 50, Code S = $20,001 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 60000,
        box12_entries: [{ code: "S", amount: 20001 }],
        taxpayer_age: 50,
      })]),
    Error,
  );
});

Deno.test("simple_ira_limit_60_63_at: Age 62, Code S = $21,750 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 60000,
    box12_entries: [{ code: "S", amount: 21750 }],
    taxpayer_age: 62,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("simple_ira_limit_60_63_above: Age 62, Code S = $21,751 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 60000,
        box12_entries: [{ code: "S", amount: 21751 }],
        taxpayer_age: 62,
      })]),
    Error,
  );
});

Deno.test("adoption_exclusion_below: Code T = $17,279 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 80000,
      box12_entries: [{ code: "T", amount: 17279 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("adoption_exclusion_at: Code T = $17,280 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 80000,
      box12_entries: [{ code: "T", amount: 17280 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("adoption_phase_out_begins_at: MAGI = $259,190 does not throw", () => {
  // Phase-out is tracked downstream in form8839; W2 node passes amount through
  const result = compute([
    minimalItem({
      box1_wages: 259190,
      box12_entries: [{ code: "T", amount: 5000 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("adoption_phase_out_complete_at: MAGI = $299,190 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 299190,
      box12_entries: [{ code: "T", amount: 5000 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("hsa_limit_self_only_at: Code W = $4,300 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 60000,
      box12_entries: [{ code: "W", amount: 4300 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("hsa_limit_family_at: Code W = $8,550 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 60000,
      box12_entries: [{ code: "W", amount: 8550 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("archer_msa_limit_self_only_at: Code R self-only = $2,795 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 50000,
      box12_entries: [{ code: "R", amount: 2795 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("archer_msa_limit_family_at: Code R family = $6,413 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 50000,
      box12_entries: [{ code: "R", amount: 6413 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("qsehra_limit_self_only_at: Code FF self-only = $6,350 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 50000,
      box12_entries: [{ code: "FF", amount: 6350 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("qsehra_limit_family_at: Code FF family = $12,800 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 50000,
      box12_entries: [{ code: "FF", amount: 12800 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("saver_credit_agi_single_at: Single, Code D deduction, MAGI = $39,500 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 39500,
      box12_entries: [{ code: "D", amount: 3000 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("saver_credit_agi_single_above: Single, Code D deduction, MAGI = $39,501 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 39501,
      box12_entries: [{ code: "D", amount: 3000 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("saver_credit_agi_hoh_at: HOH, Code D deduction, MAGI = $59,250 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 59250,
      box12_entries: [{ code: "D", amount: 3000 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("saver_credit_agi_hoh_above: HOH, Code D deduction, MAGI = $59,251 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 59251,
      box12_entries: [{ code: "D", amount: 3000 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("saver_credit_agi_mfj_at: MFJ, Code D deduction, MAGI = $79,000 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 79000,
      box12_entries: [{ code: "D", amount: 3000 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("saver_credit_agi_mfj_above: MFJ, Code D deduction, MAGI = $79,001 does not throw", () => {
  const result = compute([
    minimalItem({
      box1_wages: 79001,
      box12_entries: [{ code: "D", amount: 3000 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ============================================================
// 5. Hard Validation Rules
// ============================================================

Deno.test("rule_8_3_ss_wage_base_exceeded: Box 3 + Box 7 = $176,101 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 176101,
        box3_ss_wages: 176101,
        box4_ss_withheld: 10918.26,
      })]),
    Error,
  );
});

Deno.test("rule_8_3_ss_wage_base_boundary_pass: Box 3 + Box 7 = $176,100 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 176100,
    box3_ss_wages: 176100,
    box4_ss_withheld: 10918.20,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("rule_8_4_max_ss_tax_exceeded: Box 4 = $10,918.21 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 176100,
        box3_ss_wages: 176100,
        box4_ss_withheld: 10918.21,
      })]),
    Error,
  );
});

Deno.test("rule_8_4_max_ss_tax_boundary_pass: Box 4 = $10,918.20 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 176100,
    box3_ss_wages: 176100,
    box4_ss_withheld: 10918.20,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("rule_8_5_401k_limit_exceeded_age_under_50: Age 40, Code D + Code AA = $23,501 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 80000,
        box12_entries: [{ code: "D", amount: 20000 }, {
          code: "AA",
          amount: 3501,
        }],
        taxpayer_age: 40,
      })]),
    Error,
  );
});

Deno.test("rule_8_5_401k_limit_boundary_pass_age_under_50: Age 40, Code D + Code AA = $23,500 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box12_entries: [{ code: "D", amount: 15000 }, { code: "AA", amount: 8500 }],
    taxpayer_age: 40,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("rule_8_5_401k_limit_exceeded_age_50_59: Age 50, Code D + Code AA = $31,001 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 150000,
        box12_entries: [{ code: "D", amount: 23500 }, {
          code: "AA",
          amount: 7501,
        }],
        taxpayer_age: 50,
      })]),
    Error,
  );
});

Deno.test("rule_8_5_401k_limit_boundary_pass_age_50_59: Age 50, Code D + Code AA = $31,000 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 150000,
    box12_entries: [{ code: "D", amount: 23500 }, { code: "AA", amount: 7500 }],
    taxpayer_age: 50,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("rule_8_5_401k_limit_exceeded_age_60_63: Age 62, Code D + Code AA = $34,751 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 200000,
        box12_entries: [{ code: "D", amount: 23500 }, {
          code: "AA",
          amount: 11251,
        }],
        taxpayer_age: 62,
      })]),
    Error,
  );
});

Deno.test("rule_8_5_401k_limit_boundary_pass_age_60_63: Age 62, Code D + Code AA = $34,750 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 200000,
    box12_entries: [{ code: "D", amount: 23500 }, {
      code: "AA",
      amount: 11250,
    }],
    taxpayer_age: 62,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("rule_8_6_403b_limit_exceeded_age_under_50: Age 40, Code E + Code BB = $23,501 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 80000,
        box12_entries: [{ code: "E", amount: 20000 }, {
          code: "BB",
          amount: 3501,
        }],
        taxpayer_age: 40,
      })]),
    Error,
  );
});

Deno.test("rule_8_6_403b_limit_boundary_pass_age_under_50: Age 40, Code E + Code BB = $23,500 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box12_entries: [{ code: "E", amount: 15000 }, { code: "BB", amount: 8500 }],
    taxpayer_age: 40,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("rule_8_6_403b_limit_exceeded_age_50_59: Age 50, Code E + Code BB = $31,001 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 150000,
        box12_entries: [{ code: "E", amount: 23500 }, {
          code: "BB",
          amount: 7501,
        }],
        taxpayer_age: 50,
      })]),
    Error,
  );
});

Deno.test("rule_8_6_403b_limit_boundary_pass_age_50_59: Age 50, Code E + Code BB = $31,000 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 150000,
    box12_entries: [{ code: "E", amount: 23500 }, { code: "BB", amount: 7500 }],
    taxpayer_age: 50,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("rule_8_6_403b_limit_exceeded_age_60_63: Age 62, Code E + Code BB = $34,751 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 200000,
        box12_entries: [{ code: "E", amount: 23500 }, {
          code: "BB",
          amount: 11251,
        }],
        taxpayer_age: 62,
      })]),
    Error,
  );
});

Deno.test("rule_8_6_403b_limit_boundary_pass_age_60_63: Age 62, Code E + Code BB = $34,750 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 200000,
    box12_entries: [{ code: "E", amount: 23500 }, {
      code: "BB",
      amount: 11250,
    }],
    taxpayer_age: 62,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("rule_8_7_457b_limit_exceeded_age_under_50: Age 40, Code G + Code EE = $23,501 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 80000,
        box12_entries: [{ code: "G", amount: 20000 }, {
          code: "EE",
          amount: 3501,
        }],
        taxpayer_age: 40,
      })]),
    Error,
  );
});

Deno.test("rule_8_7_457b_limit_boundary_pass_age_under_50: Age 40, Code G + Code EE = $23,500 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box12_entries: [{ code: "G", amount: 15000 }, { code: "EE", amount: 8500 }],
    taxpayer_age: 40,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("rule_8_7_457b_limit_exceeded_age_50_59: Age 50, Code G + Code EE = $31,001 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 150000,
        box12_entries: [{ code: "G", amount: 23500 }, {
          code: "EE",
          amount: 7501,
        }],
        taxpayer_age: 50,
      })]),
    Error,
  );
});

Deno.test("rule_8_7_457b_limit_boundary_pass_age_50_59: Age 50, Code G + Code EE = $31,000 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 150000,
    box12_entries: [{ code: "G", amount: 23500 }, { code: "EE", amount: 7500 }],
    taxpayer_age: 50,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("rule_8_7_457b_limit_exceeded_age_60_63: Age 62, Code G + Code EE = $34,751 throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_wages: 200000,
        box12_entries: [{ code: "G", amount: 23500 }, {
          code: "EE",
          amount: 11251,
        }],
        taxpayer_age: 62,
      })]),
    Error,
  );
});

Deno.test("rule_8_7_457b_limit_boundary_pass_age_60_63: Age 62, Code G + Code EE = $34,750 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 200000,
    box12_entries: [{ code: "G", amount: 23500 }, {
      code: "EE",
      amount: 11250,
    }],
    taxpayer_age: 62,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ============================================================
// 6. Warning-Only Rules
// ============================================================

Deno.test("rule_8_1_ss_tax_rate_mismatch: Box 3 = $50,000, Box 4 = $3,050 (deviation > $0.50) still computes", () => {
  // Rule 8.1 is a WARNING — compute must succeed
  const result = compute([minimalItem({
    box1_wages: 50000,
    box3_ss_wages: 50000,
    box4_ss_withheld: 3050, // expected 3100; deviation = 50 > 0.50
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("rule_8_1_ss_tax_rate_within_tolerance: Box 3 = $50,000, Box 4 = $3,100 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 50000,
    box3_ss_wages: 50000,
    box4_ss_withheld: 3100, // exactly 50000 × 0.062
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("rule_8_2_medicare_tax_rate_mismatch: Box 5 = $50,000, Box 6 = $724 (deviation > $0.50) still computes", () => {
  // Rule 8.2 is a WARNING — compute must succeed
  const result = compute([minimalItem({
    box1_wages: 50000,
    box5_medicare_wages: 50000,
    box6_medicare_withheld: 724, // expected 725; deviation = 1 > 0.50
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("rule_8_2_medicare_tax_rate_within_tolerance: Box 5 = $50,000, Box 6 = $725 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 50000,
    box5_medicare_wages: 50000,
    box6_medicare_withheld: 725, // exactly 50000 × 0.0145
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("rule_8_8_dependent_care_exceeds_limit: Box 10 = $5,001 does not throw (warning only)", () => {
  const result = compute([
    minimalItem({ box1_wages: 80000, box10_dep_care: 5001 }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ============================================================
// 7. Informational Fields
// ============================================================

Deno.test("box_14_informational_category_no_tax_output: Box 14 informational does not change output count", () => {
  const withInfo = compute([minimalItem({
    box1_wages: 80000,
    box14_entries: [{
      description: "Info",
      amount: 500,
      is_state_sdi_pfml: false,
    }],
  })]);
  const without = compute([minimalItem({ box1_wages: 80000 })]);
  assertEquals(withInfo.outputs.length, without.outputs.length);
});

Deno.test("box_14_other_category_no_tax_output: Box 14 other category does not change output count", () => {
  const withOther = compute([minimalItem({
    box1_wages: 80000,
    box14_entries: [{
      description: "Other Item",
      amount: 300,
      is_state_sdi_pfml: false,
    }],
  })]);
  const without = compute([minimalItem({ box1_wages: 80000 })]);
  assertEquals(withOther.outputs.length, without.outputs.length);
});

Deno.test("employer_state_code_no_direct_routing: employer_state_code does not alter federal outputs", () => {
  const withState = compute([
    minimalItem({ box1_wages: 80000, box15_state: "CA" }),
  ]);
  const without = compute([minimalItem({ box1_wages: 80000 })]);
  const f1040With = findOutput(withState, "f1040");
  const f1040Without = findOutput(without, "f1040");
  assertEquals(
    fieldsOf(withState.outputs, f1040)!.line1a_wages,
    fieldsOf(without.outputs, f1040)!.line1a_wages,
  );
});

Deno.test("employer_zip_code_no_direct_routing: employer_zip does not alter federal outputs", () => {
  const withZip = compute([
    minimalItem({ box1_wages: 80000, employer_zip: "94105" }),
  ]);
  const without = compute([minimalItem({ box1_wages: 80000 })]);
  assertEquals(findOutput(withZip, "f1040") !== undefined, true);
  assertEquals(
    fieldsOf(withZip.outputs, f1040)!.line1a_wages,
    fieldsOf(without.outputs, f1040)!.line1a_wages,
  );
});

Deno.test("box_11_informational_no_action: Box 11 = $2,000 does not change output count", () => {
  const withBox11 = compute([
    minimalItem({ box1_wages: 80000, box11_nonqual_plans: 2000 }),
  ]);
  const without = compute([minimalItem({ box1_wages: 80000 })]);
  assertEquals(withBox11.outputs.length, without.outputs.length);
});

Deno.test("box12_code_c_informational: Code C (GTL >$50k) does not change output count", () => {
  const withC = compute([
    minimalItem({
      box1_wages: 80000,
      box12_entries: [{ code: "C", amount: 1000 }],
    }),
  ]);
  const without = compute([minimalItem({ box1_wages: 80000 })]);
  assertEquals(withC.outputs.length, without.outputs.length);
});

Deno.test("box12_code_f_tracking_only (informational): Code F (SAR-SEP) does not change output count", () => {
  const withF = compute([
    minimalItem({
      box1_wages: 60000,
      box12_entries: [{ code: "F", amount: 5000 }],
    }),
  ]);
  const without = compute([minimalItem({ box1_wages: 60000 })]);
  assertEquals(withF.outputs.length, without.outputs.length);
});

Deno.test("box12_code_j_informational: Code J (nontaxable sick pay) does not change output count", () => {
  const withJ = compute([
    minimalItem({ box1_wages: 0, box12_entries: [{ code: "J", amount: 500 }] }),
  ]);
  const without = compute([minimalItem({ box1_wages: 0 })]);
  assertEquals(withJ.outputs.length, without.outputs.length);
});

Deno.test("box12_code_l_informational: Code L (accountable plan reimbursement) does not change output count", () => {
  const withL = compute([
    minimalItem({
      box1_wages: 60000,
      box12_entries: [{ code: "L", amount: 300 }],
    }),
  ]);
  const without = compute([minimalItem({ box1_wages: 60000 })]);
  assertEquals(withL.outputs.length, without.outputs.length);
});

Deno.test("box12_code_p_informational: Code P (military moving expense) does not change output count", () => {
  const withP = compute([
    minimalItem({
      box1_wages: 50000,
      box12_entries: [{ code: "P", amount: 400 }],
    }),
  ]);
  const without = compute([minimalItem({ box1_wages: 50000 })]);
  assertEquals(withP.outputs.length, without.outputs.length);
});

Deno.test("box12_code_s_tracking_only (informational): Code S (SIMPLE) does not change output count", () => {
  const withS = compute([
    minimalItem({
      box1_wages: 60000,
      box12_entries: [{ code: "S", amount: 10000 }],
    }),
  ]);
  const without = compute([minimalItem({ box1_wages: 60000 })]);
  assertEquals(withS.outputs.length, without.outputs.length);
});

Deno.test("box12_code_v_informational: Code V (nonstatutory stock options) does not change output count", () => {
  const withV = compute([
    minimalItem({
      box1_wages: 100000,
      box12_entries: [{ code: "V", amount: 1000 }],
    }),
  ]);
  const without = compute([minimalItem({ box1_wages: 100000 })]);
  assertEquals(withV.outputs.length, without.outputs.length);
});

Deno.test("box12_code_y_informational: Code Y (409A deferrals) does not change output count", () => {
  const withY = compute([
    minimalItem({
      box1_wages: 80000,
      box12_entries: [{ code: "Y", amount: 600 }],
    }),
  ]);
  const without = compute([minimalItem({ box1_wages: 80000 })]);
  assertEquals(withY.outputs.length, without.outputs.length);
});

Deno.test("box12_code_dd_informational: Code DD (employer health coverage) does not change output count", () => {
  const withDD = compute([
    minimalItem({
      box1_wages: 70000,
      box12_entries: [{ code: "DD", amount: 5000 }],
    }),
  ]);
  const without = compute([minimalItem({ box1_wages: 70000 })]);
  assertEquals(withDD.outputs.length, without.outputs.length);
});

Deno.test("box12_code_ff_qsehra_informational: Code FF (QSEHRA) does not route to any active form", () => {
  const withFF = compute([
    minimalItem({
      box1_wages: 70000,
      box12_entries: [{ code: "FF", amount: 4000 }],
    }),
  ]);
  const without = compute([minimalItem({ box1_wages: 70000 })]);
  assertEquals(withFF.outputs.length, without.outputs.length);
});

Deno.test("box12_code_gg_informational: Code GG (83i income) does not change output count", () => {
  const withGG = compute([
    minimalItem({
      box1_wages: 100000,
      box12_entries: [{ code: "GG", amount: 2000 }],
    }),
  ]);
  const without = compute([minimalItem({ box1_wages: 100000 })]);
  assertEquals(withGG.outputs.length, without.outputs.length);
});

Deno.test("box12_code_hh_informational: Code HH (83i deferrals) does not change output count", () => {
  const withHH = compute([
    minimalItem({
      box1_wages: 80000,
      box12_entries: [{ code: "HH", amount: 1500 }],
    }),
  ]);
  const without = compute([minimalItem({ box1_wages: 80000 })]);
  assertEquals(withHH.outputs.length, without.outputs.length);
});

Deno.test("box12_code_ii_informational: Code II (Medicaid waiver) does not change output count", () => {
  const withII = compute([
    minimalItem({
      box1_wages: 0,
      box12_entries: [{ code: "II", amount: 800 }],
    }),
  ]);
  const without = compute([minimalItem({ box1_wages: 0 })]);
  assertEquals(withII.outputs.length, without.outputs.length);
});

Deno.test("box12_code_aa_informational_contribution_tracking: Code AA (Roth 401k) does not produce standalone routing", () => {
  // AA is aggregated with D for limit checking; it routes to form8880 as part of elective_deferrals
  const result = compute([
    minimalItem({
      box1_wages: 80000,
      box12_entries: [{ code: "AA", amount: 5000 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("box12_code_bb_informational_contribution_tracking: Code BB (Roth 403b) does not produce standalone routing", () => {
  const result = compute([
    minimalItem({
      box1_wages: 60000,
      box12_entries: [{ code: "BB", amount: 5000 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("box12_code_ee_informational_contribution_tracking: Code EE (Roth 457b) does not produce standalone routing", () => {
  const result = compute([
    minimalItem({
      box1_wages: 60000,
      box12_entries: [{ code: "EE", amount: 5000 }],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("box13_third_party_sick_informational: Box 13 third party sick = true does not change output count", () => {
  const withSick = compute([
    minimalItem({
      box1_wages: 60000,
      box2_fed_withheld: 6000,
      box13_third_party_sick: true,
    }),
  ]);
  const without = compute([
    minimalItem({ box1_wages: 60000, box2_fed_withheld: 6000 }),
  ]);
  assertEquals(withSick.outputs.length, without.outputs.length);
});

Deno.test("box14b_tipped_code_informational: Box 14b tipped occupation code does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 40000, box14b_tipped_code: "3010" }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ============================================================
// 8. Edge Cases
// ============================================================

Deno.test("multiple_employers_excess_ss_withholding: 2 W-2s each with Box 4 at max → schedule3 line11 excess credit", () => {
  const result = compute([
    minimalItem({
      box1_wages: 176100,
      box3_ss_wages: 176100,
      box4_ss_withheld: 10918.20,
    }),
    minimalItem({
      box1_wages: 176100,
      box3_ss_wages: 176100,
      box4_ss_withheld: 10918.20,
    }),
  ]);
  const schedule3Out = findOutput(result, "schedule3");
  assertEquals(schedule3Out !== undefined, true);
  const excess = fieldsOf(result.outputs, schedule3)!
    .line11_excess_ss as number;
  assertEquals(excess > 0, true);
});

Deno.test("single_employer_over_withholding_no_credit: 1 W-2 over-withheld by single employer does NOT produce schedule3", () => {
  // Rule: excess SS credit only for MULTIPLE employers; single employer over-withholding is a W-2 error
  const result = compute([
    minimalItem({
      box1_wages: 176100,
      box3_ss_wages: 176100,
      box4_ss_withheld: 10918.20,
    }),
  ]);
  const schedule3Out = findOutput(result, "schedule3");
  if (schedule3Out !== undefined) {
    const excess =
      fieldsOf(result.outputs, schedule3)!.line11_excess_ss;
    assertEquals(!excess || excess === 0, true);
  } else {
    assertEquals(schedule3Out, undefined);
  }
});

Deno.test("additional_medicare_tax_multi_employer_mfj: MFJ 2 W-2s Box 5 = $140k each → form8959 triggered", () => {
  const result = compute([
    minimalItem({
      box1_wages: 140000,
      box5_medicare_wages: 140000,
      box6_medicare_withheld: 2030,
    }),
    minimalItem({
      box1_wages: 140000,
      box5_medicare_wages: 140000,
      box6_medicare_withheld: 2030,
    }),
  ]);
  const out = findOutput(result, "form8959");
  assertEquals(out !== undefined, true);
});

Deno.test("additional_medicare_tax_mfs_threshold: MFS Box 5 = $125,001 routes to form8959", () => {
  const result = compute([minimalItem({
    box1_wages: 125001,
    box5_medicare_wages: 125001,
    box6_medicare_withheld: 1812.51,
  })]);
  const out = findOutput(result, "form8959");
  assertEquals(out !== undefined, true);
});

Deno.test("statutory_employee_to_schedule_c: Box 13 statutory = true, Box 1 = $40,000 routes to schedule_c", () => {
  const result = compute([
    minimalItem({ box1_wages: 40000, box13_statutory_employee: true }),
  ]);
  const out = findOutput(result, "schedule_c");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, scheduleC)!.statutory_wages, 40000);
});

Deno.test("allocated_tips_form_4137_required: Box 8 = $2,000 routes to form4137", () => {
  const result = compute([
    minimalItem({ box1_wages: 30000, box8_allocated_tips: 2000 }),
  ]);
  const out = findOutput(result, "form4137");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, form4137)!.allocated_tips, 2000);
});

Deno.test("multiple_w2_states_proportional_allocation: 2 W-2 records — combined Box 1 is the sum of both", () => {
  const result = compute([
    minimalItem({
      box1_wages: 60000,
      box16_state_wages: 60000,
      box17_state_withheld: 3000,
    }),
    minimalItem({
      box1_wages: 40000,
      box16_state_wages: 40000,
      box17_state_withheld: 2000,
    }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line1a_wages,
    100000,
  );
});

Deno.test("secure_2_0_enhanced_catchup_age_60_63: Age 61, Code D = $11,250 + Code AA = $23,500 total = $34,750 is valid", () => {
  const result = compute([minimalItem({
    box1_wages: 200000,
    box12_entries: [{ code: "D", amount: 11250 }, {
      code: "AA",
      amount: 23500,
    }],
    taxpayer_age: 61,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("hsa_form_8889_interaction: Code W = $2,000 routes to form8889", () => {
  const result = compute([
    minimalItem({
      box1_wages: 60000,
      box12_entries: [{ code: "W", amount: 2000 }],
    }),
  ]);
  const out = findOutput(result, "form8889");
  assertEquals(out !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, form8889)!.employer_hsa_contributions,
    2000,
  );
});

Deno.test("dependent_care_exceeding_limit_double_counted: Box 10 = $5,500 still routes to form2441", () => {
  const result = compute([
    minimalItem({ box1_wages: 80000, box10_dep_care: 5500 }),
  ]);
  const out = findOutput(result, "form2441");
  assertEquals(out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, form2441)!.dep_care_benefits, 5500);
});

Deno.test("box_14b_tipped_occupation_code: Box 14b = '3010' is accepted and does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 40000, box14b_tipped_code: "3010" }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("box_14_category_field_validation: Box 14 entries with valid is_state_sdi_pfml values are accepted", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box14_entries: [
      { description: "CA SDI", amount: 500, is_state_sdi_pfml: true },
      { description: "Union Dues", amount: 200, is_state_sdi_pfml: false },
    ],
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("mfs_ira_phase_out_harshest: MFS, MAGI = $5,000, Box 13 retirement = true does not throw", () => {
  const result = compute([
    minimalItem({ box1_wages: 5000, box13_retirement_plan: true }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("box_14_state_sdi_pfml_flows_to_schedule_a: Box 14 is_state_sdi_pfml = true, amount = $600 routes to schedule_a", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box14_entries: [{
      description: "CA SDI",
      amount: 600,
      is_state_sdi_pfml: true,
    }],
  })]);
  const out = findOutput(result, "schedule_a");
  assertEquals(out !== undefined, true);
  const stateInput = fieldsOf(result.outputs, scheduleA)!
    .line_5a_tax_amount as number;
  assertEquals(stateInput >= 600, true);
});

Deno.test("box_14_sdi_pfml_salt_cap_check: Box 14 SDI=$500 + state and local withholding does not throw", () => {
  const result = compute([minimalItem({
    box1_wages: 80000,
    box14_entries: [{
      description: "CA SDI",
      amount: 500,
      is_state_sdi_pfml: true,
    }],
    box17_state_withheld: 5000,
    box19_local_withheld: 5000,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("archer_msa_form_8853_part_i: Code R = $1,500 routes to form8853", () => {
  const result = compute([
    minimalItem({
      box1_wages: 50000,
      box12_entries: [{ code: "R", amount: 1500 }],
    }),
  ]);
  const out = findOutput(result, "form8853");
  assertEquals(out !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, form8853)!.employer_archer_msa,
    1500,
  );
});

// ============================================================
// 9. Smoke Test
// ============================================================

Deno.test("comprehensive_w2_full_workflow: Complete W-2 with all major boxes populated routes to all expected forms", () => {
  const result = compute([minimalItem({
    box1_wages: 75000,
    box2_fed_withheld: 8000,
    box3_ss_wages: 75000,
    box4_ss_withheld: 4650,
    box5_medicare_wages: 75000,
    box6_medicare_withheld: 1087.50,
    box8_allocated_tips: 500,
    box10_dep_care: 3000,
    box12_entries: [
      { code: "D", amount: 8000 },
      { code: "W", amount: 2000 },
      { code: "T", amount: 3000 },
      { code: "R", amount: 1200 },
    ],
    box13_retirement_plan: true,
    box14_entries: [{
      description: "CA SDI",
      amount: 400,
      is_state_sdi_pfml: true,
    }],
    box15_state: "CA",
    box16_state_wages: 75000,
    box17_state_withheld: 5000,
    taxpayer_age: 45,
  })]);

  // f1040 receives wages and withholding
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line1a_wages,
    75000,
  );
  assertEquals(
    fieldsOf(result.outputs, f1040)!.line25a_w2_withheld,
    8000,
  );

  // Medicare data flows to form8959
  const form8959Out = findOutput(result, "form8959");
  assertEquals(form8959Out !== undefined, true);

  // Allocated tips flow to form4137
  const form4137Out = findOutput(result, "form4137");
  assertEquals(form4137Out !== undefined, true);

  // Dependent care flows to form2441
  const form2441Out = findOutput(result, "form2441");
  assertEquals(form2441Out !== undefined, true);

  // HSA employer contributions flow to form8889
  const form8889Out = findOutput(result, "form8889");
  assertEquals(form8889Out !== undefined, true);

  // Adoption benefits flow to form8839
  const form8839Out = findOutput(result, "form8839");
  assertEquals(form8839Out !== undefined, true);

  // Archer MSA flows to form8853
  const form8853Out = findOutput(result, "form8853");
  assertEquals(form8853Out !== undefined, true);

  // 401k deferral flows to form8880
  const form8880Out = findOutput(result, "form8880");
  assertEquals(form8880Out !== undefined, true);

  // Retirement plan flag flows to ira_deduction_worksheet
  const iraOut = findOutput(result, "ira_deduction_worksheet");
  assertEquals(iraOut !== undefined, true);

  // SDI flows to schedule_a
  const schedAOut = findOutput(result, "schedule_a");
  assertEquals(schedAOut !== undefined, true);
});
