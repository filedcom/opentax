import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  calculateSchedule3_2026,
  schedule3Input2026Schema,
} from "./schedule3.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "./source-registry.ts";
import { eicGraphFixture2026 } from "./nodes/eitc.fixture.ts";
import { excessWithholdingFixture2026 } from "./schedule3.fixture.ts";
import { FilingStatus } from "../nodes/types.ts";
import type { calculateChildCredit2026 } from "./nodes/f8812.ts";

function run(input: Record<string, unknown>) {
  return execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    input,
    { taxYear: 2026, formType: "f1040" },
  );
}
Deno.test("2026 Schedule 3 totals preserve the new line 13e and exclude reserved 5b/6e", () => {
  const r = calculateSchedule3_2026({
    line1_foreign_tax_credit: 10,
    line1_foreign_tax_1099: [20, 30],
    line2_childcare_credit: 40,
    line3_education_credit: 50,
    line4_retirement_savings_credit: 60,
    line5a_residential_clean_energy: 70,
    line6a_general_business_credit: 80,
    line6a_low_income_housing_credit: 90,
    line6b_prior_year_min_tax_credit: 100,
    line6c_adoption_credit: 110,
    line6d_elderly_disabled_credit: 120,
    line6f_clean_vehicle_credit: [130, 140],
    line6g_mortgage_interest_credit: 150,
    line6h_dc_homebuyer_credit: 160,
    line6i_qualified_electric_vehicle_credit: 170,
    line6j_alt_fuel_vehicle_refueling: 180,
    line6k_tax_credit_bonds: 190,
    line6l_form8978_credit: 200,
    line6m_prev_owned_clean_vehicle_credit: 210,
    line6z_other_credits: [{
      description: "Reviewed credit",
      amount: 220,
      source_reference: "credit-source",
    }],
    line9_premium_tax_credit: 230,
    line10_amount_paid_extension: 240,
    line11_excess_ss: 250,
    line12_fuel_tax_credit: 260,
    line13a_tax_paid_by_ric_or_reit: [270, 280],
    line13b_section1341_credit: 290,
    line13c_elective_payment: 300,
    line13d_deferred_section965: 310,
    line13e_section1062_tax: 320,
    line13z_other_payments: [{
      description: "Reviewed payment",
      amount: 330,
      source_reference: "payment-source",
    }],
  });
  assertEquals(r.lines.line7_total, 2250);
  assertEquals(r.lines.line8_total, 2530);
  assertEquals(r.lines.line14_total, 2100);
  assertEquals(r.lines.line15_total, 3080);
  assert(r.file_schedule3);
  for (const reserved of ["line5b_energy_efficient_home", "line6e_credit"]) {
    assertEquals(
      schedule3Input2026Schema.safeParse({ [reserved]: 0 }).success,
      false,
    );
  }
  assertEquals(
    schedule3Input2026Schema.safeParse({ form3800_source_credit_pending: true })
      .success,
    false,
  );
});
Deno.test("2026 Schedule 3 combines source cents before rounding each printed line", () => {
  const r = calculateSchedule3_2026({
    line1_foreign_tax_credit: 10.25,
    line1_foreign_tax_1099: [20.24, 30.01],
    line6a_general_business_credit: 10.25,
    line6a_low_income_housing_credit: 20.25,
    line13a_tax_paid_by_ric_or_reit: [1.25, 2.25],
  });
  assertEquals(r.lines.line1_total, 61);
  assertEquals(r.lines.line6a_total, 31);
  assertEquals(r.lines.line15_total, 4);
  assertEquals(calculateSchedule3_2026({}).file_schedule3, false);
  assertThrows(() => calculateSchedule3_2026({ line11_excess_ss: Infinity }));
});
Deno.test("2026 excess W-2 Social Security credit reaches settlement once", () => {
  const r = run(excessWithholdingFixture2026());
  assertEquals(r.diagnostics, []);
  const c = r.pending.schedule3_final.calculation_2026 as ReturnType<
    typeof calculateSchedule3_2026
  >;
  assertEquals(c.input.line11_excess_ss, 7161);
  assertEquals(c.lines.line15_total, 7161);
  assertEquals(r.pending.f1040.line31_other_payments, 7161);
  assertEquals(r.pending.f1040.line33_total_payments, 37161);
  assertEquals(r.pending.f8812.finalized_excess_social_security, 7161);
});
Deno.test("2026 ACTC payroll method deducts finalized excess Social Security as well as EIC", () => {
  const r = run(excessWithholdingFixture2026(10000, 3));
  assertEquals(r.diagnostics, []);
  const c = r.pending.f8812.calculation_2026 as ReturnType<
    typeof calculateChildCredit2026
  >;
  assertEquals(c.lines?.partIIBLines?.line24, 11672); // EIC 4511 + excess 7161.
  assertEquals(c.lines?.partIIBLines?.line21, 23850); // actual FICA 22950 + wage Medicare tax 900.
  assertEquals(c.lines?.partIIBLines?.line25, 12178);
  assertEquals(r.pending.f1040.line28_actc, 5100);
});
Deno.test("2026 joint excess Social Security stays separate for each spouse", () => {
  const base = excessWithholdingFixture2026();
  const r = run({
    ...base,
    general: {
      ...base.general,
      filing_status: FilingStatus.MFJ,
      spouse_ssn: "444556666",
      spouse_first_name: "Joint",
      spouse_last_name: "Investor",
      spouse_dob: "1982-01-01",
      spouse_blind: false,
      spouse_can_be_claimed_as_dependent: false,
      spouse_citizen_national_or_work_authorized: true,
      spouse_ssn_valid_for_employment: true,
      spouse_ssn_issued_before_due_date: true,
      spouse_tin_issued_by_due_date: true,
    },
    w2s: [base.w2s[0], { ...base.w2s[1], employee_ssn: "444556666" }],
  });
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line31_other_payments, 0);
  assertEquals(
    (r.pending.schedule3_final.calculation_2026 as ReturnType<
      typeof calculateSchedule3_2026
    >).file_schedule3,
    false,
  );
});
Deno.test("2026 Schedule 3 is internal and rejects public line totals", () => {
  assertEquals(
    sourceRegistry2026.start.inputSchema.safeParse({
      general: eicGraphFixture2026().general,
      schedule3: { line11_excess_ss: 999 },
    }).success,
    false,
  );
});

Deno.test("2026 excess credit includes reported tips and requires all employers' actual withholding", () => {
  const base = excessWithholdingFixture2026();
  const tipped = run({
    ...base,
    w2s: base.w2s.map((w) => ({
      ...w,
      box3_ss_wages: 80000,
      box7_ss_tips: 70000,
    })),
  });
  assertEquals(tipped.diagnostics, []);
  assertEquals(tipped.pending.f1040.line31_other_payments, 7161);
  const { box4_ss_withheld: _box4, ...missing } = base.w2s[1];
  const r = run({ ...base, w2s: [base.w2s[0], missing] });
  assert(
    r.diagnostics.some((d) =>
      d.nodeType === "w2" && d.message.includes("every employer")
    ),
  );
  const sameEmployer = run({
    ...base,
    w2s: [base.w2s[0], {
      ...base.w2s[1],
      employer_ein: base.w2s[0].employer_ein,
    }],
  });
  assert(
    sameEmployer.diagnostics.some((d) =>
      d.nodeType === "w2" && d.message.includes("same-employer")
    ),
  );
});
