import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { form5695TaxLimits } from "./form5695_tax_limits.ts";

function source(wages: number, f5695: Record<string, unknown>) {
  return {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Example",
      taxpayer_dob: "1987-04-30",
    },
    w2: [{
      box1_wages: wages,
      box2_fed_withheld: wages / 10,
      box3_ss_wages: wages,
      box4_ss_withheld: wages * 0.062,
      box5_medicare_wages: wages,
      box6_medicare_withheld: wages * 0.0145,
    }],
    f5695,
  };
}

function filed(inputs: Record<string, unknown>) {
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  return buildPending(result.pending);
}

// $72,000 wages less the $15,750 standard deduction: line 18 tax is $7,295.
test("Part I limit is derived from the return when the preparer leaves it out", () => {
  const pending = filed(source(72_000, { solar_electric_cost: 20_000 }));
  assertEquals(pending.form5695?.part_i_tax_limit, 7_295);
  assertEquals(pending.schedule3?.line5a_residential_clean_energy, 6_000);
  assertEquals(pending.f1040?.line24_total_tax, 1_295);
});

test("Part II limit precedes Part I, which is reduced by Form 5695 line 32", () => {
  // $20,000 wages leave $428 of Tax Table tax for both parts.
  const pending = filed(
    source(20_000, { windows_cost: 2_000, solar_electric_cost: 10_000 }),
  );
  assertEquals(pending.f1040?.line18_total_tax_before_credits, 428);
  assertEquals(pending.form5695?.part_ii_tax_limit, 428);
  assertEquals(pending.schedule3?.line5b_energy_efficient_home, 428);
  assertEquals(pending.form5695?.part_i_tax_limit, 0);
  assertEquals(pending.schedule3?.line5a_residential_clean_energy, undefined);
});

test("preparer limits equal to the worksheets are accepted", () => {
  const pending = filed(
    source(20_000, {
      windows_cost: 2_000,
      solar_electric_cost: 10_000,
      part_i_tax_limit: 0,
      part_ii_tax_limit: 428,
    }),
  );
  assertEquals(pending.schedule3?.line5b_energy_efficient_home, 428);
});

test("preparer limits that differ from the worksheets are rejected", () => {
  assertThrows(
    () =>
      f1040_2025.executeReturn(
        source(72_000, { solar_electric_cost: 20_000, part_i_tax_limit: 7_000 }),
      ),
    Error,
    "Part I tax-liability limit must equal",
  );
  assertThrows(
    () =>
      f1040_2025.executeReturn(
        source(20_000, { windows_cost: 2_000, part_ii_tax_limit: 600 }),
      ),
    Error,
    "Part II tax-liability limit must equal",
  );
});

// Line 14 worksheet: Part I is also reduced by Schedule 3 lines 6c, 6f, 6g,
// 6h and 6m and by Form 1040 line 19, or Schedule 8812 Credit Limit
// Worksheet B line 14 when that worksheet applies.
test("Line 14 worksheet subtracts the credits that precede Part I", () => {
  const executed = {
    pending: {
      f1040: {
        line18_total_tax_before_credits: 9_000,
        line19_child_tax_credit: 2_000,
        form8859_worksheet_b_applies: true,
        form8859_worksheet_b_line14: 500,
      },
      schedule3: {
        line2_childcare_credit: 600,
        line6c_adoption_credit: 100,
        line6f_clean_vehicle_credit: 7_500,
        line6f_total: 200,
        line6g_mortgage_interest_credit: 300,
        line6h_dc_homebuyer_credit: 400,
        line6m_prev_owned_clean_vehicle_credit: 50,
      },
    },
    diagnostics: [],
    carryforwards: {},
  };
  assertEquals(form5695TaxLimits(executed, () => 1_000), {
    partI: 8_400 - 1_000 - 500 - 100 - 200 - 300 - 400 - 50,
    partII: 8_400,
  });
});

// Form 8859 carryforward of $1,000 is limited by line 18 less Schedule 3
// line 5b, so it is allowed in full and precedes Part I: 7,295 - 600 - 1,000.
function homebuyer(f5695: Record<string, unknown>) {
  return {
    ...source(72_000, {
      solar_electric_cost: 30_000,
      windows_cost: 2_000,
      ...f5695,
    }),
    f8859: [{ carryforward_amount: 1_000 }],
  };
}

test("Part I is derived after a Schedule 3 line 6h credit", () => {
  const pending = filed(homebuyer({}));
  assertEquals(pending.schedule3?.line5b_energy_efficient_home, 600);
  assertEquals(pending.schedule3?.line6h_dc_homebuyer_credit, 1_000);
  assertEquals(pending.form5695?.part_i_tax_limit, 5_695);
  assertEquals(pending.schedule3?.line5a_residential_clean_energy, 5_695);
});

test("a Part I limit after a Schedule 3 line 6h credit must match", () => {
  assertEquals(
    filed(homebuyer({ part_i_tax_limit: 5_695 })).schedule3
      ?.line5a_residential_clean_energy,
    5_695,
  );
  assertThrows(
    () => f1040_2025.executeReturn(homebuyer({ part_i_tax_limit: 6_695 })),
    Error,
    "Part I tax-liability limit must equal",
  );
});

// Head of household, one qualifying child, $60,000 wages: line 18 tax is
// $4,025 and Schedule 8812 line 12 is $2,200.
function withChild(
  worksheetBLine15: number | undefined,
  f5695: Record<string, unknown>,
) {
  return {
    general: {
      filing_status: "hoh",
      taxpayer_first_name: "Morgan",
      taxpayer_last_name: "Hayes",
      taxpayer_dob: "1985-04-10",
      taxpayer_ssn: "111-22-3333",
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
      taxpayer_can_be_claimed_as_dependent: false,
      hoh_paid_more_than_half_home_costs: true,
      main_home_in_us_over_half_year: true,
      dependents: [{
        first_name: "Lily",
        last_name: "Hayes",
        dob: "2015-07-22",
        relationship: "daughter",
        months_in_home: 12,
        qualifying_child_for_ctc: true,
        ssn: "222-33-4400",
        ssn_valid_for_employment: true,
        ssn_issued_before_due_date: true,
        tin_issued_by_due_date: true,
        us_citizen_national_or_resident: true,
        provided_over_half_own_support: false,
        filed_joint_return_except_refund_only: false,
        dependent_on_another_return: false,
        lived_in_us_over_half_year: true,
        months_lived_with_you_in_us: 12,
      }],
    },
    w2: [{
      box1_wages: 60_000,
      box2_fed_withheld: 3_500,
      box3_ss_wages: 60_000,
      box4_ss_withheld: 3_720,
      box5_medicare_wages: 60_000,
      box6_medicare_withheld: 870,
    }],
    f8812_credit_limit_worksheet: {
      credit_limit_worksheet: {
        schedule3_line1: 0,
        schedule3_line2: 0,
        schedule3_line3: 0,
        schedule3_line4: 0,
        schedule3_line5b: 0,
        schedule3_line6d: 0,
        schedule3_line6f: 0,
        schedule3_line6l: 0,
        schedule3_line6m: 0,
        worksheet_b_applies: worksheetBLine15 !== undefined,
        ...(worksheetBLine15 === undefined
          ? {}
          : { worksheet_b_line15: worksheetBLine15 }),
      },
    },
    f8812_earned_income_worksheet: {
      earned_income_worksheet: {
        form1040_line1z_wages: 60_000,
        nontaxable_combat_pay: 0,
        schedule_c_statutory_employee_income: 0,
        nonfarm_schedule_c_and_k1_net: 0,
        farm_schedule_f_and_k1_net: 0,
        farm_optional_method_used: false,
        excluded_medicaid_waiver_payments: 0,
        schedule1_line15_se_deduction: 0,
      },
    },
    f5695: { solar_electric_cost: 20_000, ...f5695 },
  };
}

test("Part I is derived after the child tax credit on Form 1040 line 19", () => {
  const pending = filed(withChild(undefined, {}));
  assertEquals(pending.f1040?.line19_child_tax_credit, 2_200);
  assertEquals(pending.form5695?.part_i_tax_limit, 1_825);
});

// Credit Limit Worksheet B line 14: 2,200 less the smaller of 1,700 and
// 15% of (60,000 - 2,500), so Part I is limited to 4,025 - 500.
test("Part I uses Credit Limit Worksheet B line 14 when that worksheet applies", () => {
  const pending = filed(withChild(3_525, {}));
  assertEquals(pending.f1040?.form8859_worksheet_b_line14, 500);
  assertEquals(pending.form5695?.part_i_tax_limit, 3_525);
  assertEquals(pending.schedule3?.line5a_residential_clean_energy, 3_525);
  assertEquals(pending.f1040?.line19_child_tax_credit, 500);
});

test("a Part I limit after the child tax credit must match", () => {
  assertEquals(
    filed(withChild(3_525, { part_i_tax_limit: 3_525 })).form5695
      ?.part_i_tax_limit,
    3_525,
  );
  assertThrows(
    () => f1040_2025.executeReturn(withChild(3_000, { part_i_tax_limit: 3_000 })),
    Error,
    "Part I tax-liability limit must equal",
  );
  assertThrows(
    () => f1040_2025.executeReturn(withChild(undefined, { part_i_tax_limit: 4_025 })),
    Error,
    "Part I tax-liability limit must equal",
  );
});
