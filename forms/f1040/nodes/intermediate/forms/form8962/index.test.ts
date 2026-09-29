import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8962 as form8962Mef } from "../../../../2025/mef/forms/f8962.ts";
import { form8962Pdf } from "../../../../2025/pdf/forms/f8962.ts";
import { FilingStatus } from "../../../types.ts";
import { form8962 } from "./index.ts";

const context = { taxYear: 2025, formType: "f1040" as const };
const nonApplicableBelowFpl = {
  basis: "not_applicable",
  exception_routes_reviewed: true,
  no_one_can_claim_taxpayer: true,
  all_covered_individuals_lawfully_present: true,
  no_shared_policy: true,
  no_self_employed_health_insurance_deduction: true,
  no_alternative_marriage_calculation: true,
} as const;
const mfsNoException = {
  basis: "no_exception",
  exception_reviewed: true,
  no_one_can_claim_taxpayer: true,
  policy_scope: "family_only",
  all_covered_individuals_lawfully_present: true,
  no_self_employed_health_insurance_deduction: true,
} as const;
const sharedMfsAllocation = {
  basis: "mfs_no_exception",
  policy_number: "MFS-POLICY-1",
  other_taxpayer_ssn: "222334444",
  start_month: 1,
  end_month: 12,
  aptc_pct: 0.5,
} as const;

function compute(input: Record<string, unknown>) {
  return form8962.compute(context, {
    fpl_region: "contiguous",
    filing_status: FilingStatus.Single,
    dependent_income_complete: true,
    ...input,
  });
}

function fields(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((item) => item.nodeType === nodeType)?.fields;
}

function annual(
  householdIncome: number,
  annualPremium: number,
  annualSlcsp: number,
  annualAptc = 0,
  extra: Record<string, unknown> = {},
) {
  return compute({
    household_size: 1,
    taxpayer_modified_agi: householdIncome,
    annual_premium: annualPremium,
    annual_slcsp: annualSlcsp,
    annual_aptc: annualAptc,
    annual_line11_eligible: true,
    ...extra,
  });
}

Deno.test("Form 8962 has no output without marketplace premiums or APTC", () => {
  assertEquals(compute({}).outputs, []);
  assertEquals(
    compute({ household_size: 2, taxpayer_modified_agi: 30_000 }).outputs,
    [],
  );
});

Deno.test("Form 8962 clears an all-zero 1095-A instead of exporting raw source fields", () => {
  const result = compute({
    annual_premium: 0,
    annual_slcsp: 0,
    annual_aptc: 0,
  });
  assertEquals(fields(result, "form8962")?.filing_required, false);
});

const marriageAlternative = {
  both_unmarried_january_1: true,
  married_december_31: true,
  alternative_family_sizes_verified: true,
  marriage_month: 6,
  primary: {
    family_size: 1,
    policy_numbers: ["PRIMARY-1095A"],
  },
} as const;
const marriagePolicy = {
  policy_number: "PRIMARY-1095A",
  owner: "primary" as const,
  coverage_state: "NY",
  monthly_premiums: Array(12).fill(1_000),
  monthly_slcsps: Array(12).fill(1_200),
  monthly_aptcs: Array(12).fill(1_000),
};

Deno.test("Pub 974 marriage Worksheets I-V elect beneficial pre-marriage credit", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    household_size: 2,
    taxpayer_modified_agi: 80_000,
    monthly_premiums: Array(12).fill(1_000),
    monthly_slcsps: Array(12).fill(1_200),
    monthly_aptcs: Array(12).fill(1_000),
    annual_line11_eligible: true,
    alternative_marriage: marriageAlternative,
    alternative_marriage_source_month: 6,
    alternative_marriage_policies: [marriagePolicy],
  });
  const calculated = fields(result, "form8962");
  const rows = calculated?.monthly_ptc_rows as Array<{
    contribution: number;
    allowed_credit: number;
  }>;
  assertEquals(rows.length, 12);
  assertEquals(rows[0].contribution, 153);
  assertEquals(rows[0].allowed_credit, 1_000);
  assertEquals(rows[6].contribution, 552);
  assertEquals(rows[6].allowed_credit, 648);
  assertEquals(calculated?.total_premium_tax_credit, 9_888);
  assertEquals(calculated?.total_advance_ptc, 12_000);
  assertEquals(calculated?.net_premium_tax_credit, 0);
  assertEquals(calculated?.excess_advance_premium, 2_112);
  assertEquals(calculated?.alternative_marriage_primary, {
    family_size: 1,
    monthly_contribution: 153,
    start_month: 1,
    end_month: 6,
  });
  assertEquals(calculated?.alternative_marriage_spouse, undefined);
  assertThrows(
    () => form8962Mef.build(calculated!),
    Error,
    "needs Form 1095-A and finalized Form 1040 facts",
  );
  const pdf = form8962Pdf.projectFields?.(calculated!, {
    general: { filing_status: FilingStatus.MFJ },
  });
  assertEquals(pdf?.pdf_line9_yes, true);
  assertEquals(pdf?.pdf_line10_no, true);
  assertEquals(pdf?.pdf_marriage_primary_family_size, "1");
  assertEquals(pdf?.pdf_marriage_primary_start_month, "01");
  assertEquals(pdf?.pdf_marriage_primary_end_month, "06");
});

Deno.test("Pub 974 marriage worksheet keeps line 12-23 contribution through an enrollment gap", () => {
  const premiums = [800, 0, 800, ...Array(9).fill(0)];
  const slcsps = [1_000, 0, 1_000, ...Array(9).fill(0)];
  const aptcs = [1_000, 0, 1_000, ...Array(9).fill(0)];
  const result = compute({
    filing_status: FilingStatus.MFJ,
    household_size: 2,
    taxpayer_modified_agi: 80_000,
    monthly_premiums: premiums,
    monthly_slcsps: slcsps,
    monthly_aptcs: aptcs,
    alternative_marriage: {
      both_unmarried_january_1: true,
      married_december_31: true,
      alternative_family_sizes_verified: true,
      marriage_month: 3,
      primary: {
        family_size: 1,
        policy_numbers: ["GAP-1095A"],
      },
    },
    alternative_marriage_source_month: 3,
    alternative_marriage_policies: [{
      policy_number: "GAP-1095A",
      owner: "primary",
      coverage_state: "NY",
      monthly_premiums: premiums,
      monthly_slcsps: slcsps,
      monthly_aptcs: aptcs,
    }],
  });
  const form = fields(result, "form8962");
  const rows = form?.monthly_ptc_rows as Array<{
    month_code: string;
    premium: number;
    slcsp: number;
    contribution: number;
    max_assistance: number;
    allowed_credit: number;
    aptc: number;
  }>;
  assertEquals(form?.alternative_marriage_primary, {
    family_size: 1,
    monthly_contribution: 153,
    start_month: 1,
    end_month: 3,
  });
  assertEquals(rows[0].contribution, 153);
  assertEquals(rows[1], {
    month_code: "FEBRUARY",
    premium: 0,
    slcsp: 0,
    contribution: 153,
    max_assistance: 0,
    allowed_credit: 0,
    aptc: 0,
  });
  assertEquals(rows[2].contribution, 153);
  assertEquals(form?.total_premium_tax_credit, 1_600);
  assertEquals(form?.excess_advance_premium, 400);
});

Deno.test("marriage alternative requires MFJ and reconciled pre-marriage worksheets", () => {
  const base = {
    household_size: 2,
    taxpayer_modified_agi: 80_000,
    monthly_premiums: Array(12).fill(1_000),
    monthly_slcsps: Array(12).fill(1_200),
    monthly_aptcs: Array(12).fill(1_000),
    alternative_marriage: marriageAlternative,
    alternative_marriage_source_month: 6,
    alternative_marriage_policies: [marriagePolicy],
  };
  assertThrows(
    () => compute({ ...base, filing_status: FilingStatus.Single }),
    Error,
    "requires a joint return",
  );
  assertThrows(
    () =>
      compute({
        ...base,
        filing_status: FilingStatus.MFJ,
        alternative_marriage_policies: [{
          ...marriagePolicy,
          monthly_premiums: Array(12).fill(900),
        }],
      }),
    Error,
    "must reconcile",
  );
});

Deno.test("marriage Worksheets II and IV add two separate pre-marriage families", () => {
  const group = {
    family_size: 1,
    policy_numbers: ["PRIMARY-1095A"],
  };
  const result = compute({
    filing_status: FilingStatus.MFJ,
    household_size: 2,
    taxpayer_modified_agi: 80_000,
    monthly_premiums: Array(12).fill(1_000),
    monthly_slcsps: Array(12).fill(1_200),
    monthly_aptcs: Array(12).fill(1_000),
    alternative_marriage: {
      ...marriageAlternative,
      primary: group,
      spouse: { family_size: 1, policy_numbers: ["SPOUSE-1095A"] },
    },
    alternative_marriage_source_month: 6,
    alternative_marriage_policies: [
      {
        ...marriagePolicy,
        monthly_premiums: Array(12).fill(500),
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(500),
      },
      {
        ...marriagePolicy,
        policy_number: "SPOUSE-1095A",
        owner: "spouse",
        coverage_state: "CA",
        monthly_premiums: Array(12).fill(500),
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(500),
      },
    ],
  });
  const calculated = fields(result, "form8962");
  const rows = calculated?.monthly_ptc_rows as Array<{
    contribution: number;
    allowed_credit: number;
  }>;
  assertEquals(rows[0].contribution, 306);
  assertEquals(rows[0].allowed_credit, 894);
  assertEquals(rows[6].contribution, 552);
  assertEquals(calculated?.total_premium_tax_credit, 9_252);
  assertEquals(calculated?.alternative_marriage_spouse, {
    family_size: 1,
    monthly_contribution: 153,
    start_month: 1,
    end_month: 6,
  });
});

Deno.test("marriage alternative is not elected without excess APTC", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.MFJ,
        household_size: 2,
        taxpayer_modified_agi: 80_000,
        monthly_premiums: Array(12).fill(1_000),
        monthly_slcsps: Array(12).fill(1_200),
        monthly_aptcs: Array(12).fill(100),
        alternative_marriage: marriageAlternative,
        alternative_marriage_source_month: 6,
        alternative_marriage_policies: [{
          ...marriagePolicy,
          monthly_aptcs: Array(12).fill(100),
        }],
      }),
    Error,
    "requires excess APTC",
  );
});

Deno.test("marriage alternative rejects unsourced and mismatched policy identities", () => {
  const base = {
    filing_status: FilingStatus.MFJ,
    household_size: 2,
    taxpayer_modified_agi: 80_000,
    monthly_premiums: Array(12).fill(1_000),
    monthly_slcsps: Array(12).fill(1_200),
    monthly_aptcs: Array(12).fill(1_000),
    alternative_marriage: marriageAlternative,
    alternative_marriage_source_month: 6,
  };
  assertThrows(
    () =>
      compute({
        ...base,
        alternative_marriage_source_month: 5,
        alternative_marriage_policies: [marriagePolicy],
      }),
    Error,
    "must match the Form 1095-A source month",
  );
  assertThrows(() => compute(base), Error, "uniquely identified");
  assertThrows(
    () =>
      compute({
        ...base,
        alternative_marriage_policies: [{
          ...marriagePolicy,
          owner: "spouse",
        }],
      }),
    Error,
    "owned by the selected spouse",
  );
  assertThrows(
    () =>
      compute({
        ...base,
        alternative_marriage_policies: [marriagePolicy, marriagePolicy],
      }),
    Error,
    "uniquely identified",
  );
  assertThrows(
    () =>
      compute({
        ...base,
        alternative_marriage: {
          ...marriageAlternative,
          primary: {
            family_size: 1,
            monthly_premiums: Array(12).fill(1_000),
            monthly_slcsps: Array(12).fill(1_200),
          },
        },
        alternative_marriage_policies: [marriagePolicy],
      }),
    Error,
  );
});

Deno.test("annual totals alone do not establish Form 8962 line 11 eligibility", () => {
  assertThrows(
    () =>
      compute({
        household_size: 1,
        taxpayer_modified_agi: 30_000,
        annual_premium: 6_000,
        annual_slcsp: 7_000,
      }),
    Error,
    "annual line 11 needs verified full-year unchanged monthly coverage",
  );
});

Deno.test("Form 8962 separates taxpayer and dependent MAGI before line 3", () => {
  const result = annual(30_000, 6_000, 7_200, 0, {
    household_size: 2,
    dependents_modified_agi: 12_500,
  });
  const form = fields(result, "form8962");
  assertEquals(form?.taxpayer_modified_agi, 30_000);
  assertEquals(form?.dependents_modified_agi, 12_500);
  assertEquals(form?.household_income, 42_500);
});

Deno.test("Form 8962 adds elected Form 8814 dependent amount once by SSN", () => {
  const result = annual(30_000, 6_000, 7_200, 0, {
    household_size: 2,
    form8814_expected_ssns: ["123456789"],
    form8814_children: [{ ssn: "123456789", magi: 3_600 }],
  });
  const form = fields(result, "form8962");
  assertEquals(form?.dependents_modified_agi, 3_600);
  assertEquals(form?.household_income, 33_600);
});

Deno.test("Form 8962 rejects a dependent Form 8814 without the matching election", () => {
  assertThrows(
    () =>
      annual(30_000, 6_000, 7_200, 0, {
        household_size: 2,
        form8814_expected_ssns: ["123456789"],
        form8814_children: [{ ssn: "987654321", magi: 3_600 }],
      }),
    Error,
    "matching Form 8814",
  );
});

Deno.test("Form 8962 refuses unverified dependent filing facts", () => {
  assertThrows(
    () =>
      annual(30_000, 6_000, 7_200, 0, {
        dependent_income_complete: false,
      }),
    Error,
    "needs verified dependent filing and modified-AGI facts",
  );
});

Deno.test("2025 Table 2: 150% FPL has a zero applicable figure", () => {
  const result = annual(22_590, 6_000, 6_000);
  assertEquals(fields(result, "form8962")?.federal_poverty_pct, 150);
  assertEquals(fields(result, "form8962")?.applicable_figure, 0);
  assertEquals(fields(result, "form8962")?.annual_applicable_contribution, 0);
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 6_000);
});

Deno.test("2025 Table 2: 200%, 250%, and 300% FPL use 2%, 4%, and 6%", () => {
  const cases = [
    {
      income: 30_120,
      pct: 200,
      figure: 0.02,
      contribution: 602,
      credit: 3_398,
    },
    {
      income: 37_650,
      pct: 250,
      figure: 0.04,
      contribution: 1_506,
      credit: 2_494,
    },
    {
      income: 45_180,
      pct: 300,
      figure: 0.06,
      contribution: 2_711,
      credit: 1_289,
    },
  ];
  for (const sample of cases) {
    const result = annual(sample.income, 4_000, 4_000);
    assertEquals(fields(result, "form8962")?.federal_poverty_pct, sample.pct);
    assertEquals(fields(result, "form8962")?.applicable_figure, sample.figure);
    assertEquals(
      fields(result, "form8962")?.annual_applicable_contribution,
      sample.contribution,
    );
    assertEquals(
      fields(result, "schedule3")?.line9_premium_tax_credit,
      sample.credit,
    );
  }
});

Deno.test("2025 Table 2: 301% and 399% FPL use four-decimal table figures", () => {
  const at301 = annual(45_331, 7_000, 7_000);
  const at399 = annual(60_090, 7_000, 7_000);
  assertEquals(fields(at301, "form8962")?.federal_poverty_pct, 301);
  assertEquals(fields(at301, "form8962")?.applicable_figure, 0.0603);
  assertEquals(fields(at399, "form8962")?.federal_poverty_pct, 399);
  assertEquals(fields(at399, "form8962")?.applicable_figure, 0.0848);
});

Deno.test("2025 Table 2: above 400% FPL uses 401 on line 5 and 8.5%", () => {
  const result = annual(75_300, 8_000, 8_000);
  assertEquals(fields(result, "form8962")?.federal_poverty_pct, 401);
  assertEquals(fields(result, "form8962")?.applicable_figure, 0.085);
  assertEquals(
    fields(result, "form8962")?.annual_applicable_contribution,
    6_401,
  );
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 1_599);
});

Deno.test("line 11e is capped by actual premium after computing max assistance", () => {
  const result = annual(22_590, 1_000, 6_000);
  assertEquals(fields(result, "form8962")?.annual_max_ptc, 6_000);
  assertEquals(fields(result, "form8962")?.annual_ptc_allowed, 1_000);
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 1_000);
});

Deno.test("line 26 net PTC reconciles to Schedule 3", () => {
  const result = annual(40_880, 5_500, 6_000, 1_000, { household_size: 2 });
  assertEquals(fields(result, "form8962")?.annual_applicable_contribution, 818);
  assertEquals(fields(result, "form8962")?.total_premium_tax_credit, 5_182);
  assertEquals(fields(result, "form8962")?.net_premium_tax_credit, 4_182);
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 4_182);
  assertEquals(fields(result, "schedule2"), undefined);
});

Deno.test("line 29 excess APTC reconciles to Schedule 2 line 1a", () => {
  const result = annual(75_300, 6_500, 7_000, 5_000);
  assertEquals(fields(result, "form8962")?.total_premium_tax_credit, 599);
  assertEquals(fields(result, "form8962")?.excess_advance_payment, 4_401);
  assertEquals(fields(result, "form8962")?.repayment_limitation, undefined);
  assertEquals(fields(result, "form8962")?.excess_advance_premium, 4_401);
  assertEquals(
    fields(result, "schedule2")?.line1a_excess_advance_premium,
    4_401,
  );
  assertEquals(fields(result, "form6251")?.schedule2_line1z_tax, 4_401);
  assertEquals(fields(result, "schedule3"), undefined);
});

Deno.test("2025 Table 5 single repayment limits are 375, 975, and 1625", () => {
  const cases = [
    { income: 22_590, cap: 375 },
    { income: 37_650, cap: 975 },
    { income: 52_710, cap: 1_625 },
  ];
  for (const sample of cases) {
    const result = annual(sample.income, 4_000, 4_000, 10_000);
    assertEquals(fields(result, "form8962")?.repayment_limitation, sample.cap);
    assertEquals(
      fields(result, "schedule2")?.line1a_excess_advance_premium,
      sample.cap,
    );
  }
});

Deno.test("2025 Table 5 other-filing-status caps are 750, 1950, and 3250", () => {
  const cases = [
    { income: 22_590, cap: 750 },
    { income: 37_650, cap: 1_950 },
    { income: 52_710, cap: 3_250 },
  ];
  for (const sample of cases) {
    const result = annual(sample.income, 4_000, 4_000, 10_000, {
      filing_status: FilingStatus.MFJ,
    });
    assertEquals(fields(result, "form8962")?.repayment_limitation, sample.cap);
    assertEquals(
      fields(result, "schedule2")?.line1a_excess_advance_premium,
      sample.cap,
    );
  }
});

Deno.test("below 100% FPL needs exception facts with or without APTC", () => {
  for (const aptc of [0, 1_200]) {
    assertThrows(
      () => annual(10_000, 3_000, 4_000, aptc),
      Error,
      "below 100% FPL needs verified PTC exception facts",
    );
  }
});

Deno.test("below 100% FPL Marketplace-estimate eligibility uses zero contribution", () => {
  const eligibility = {
    basis: "marketplace_estimate",
    no_one_can_claim_taxpayer: true,
    marketplace_coverage: true,
    marketplace_estimated_at_least_100_fpl: true,
    marketplace_information_provided_in_good_faith: true,
    otherwise_applicable_taxpayer: true,
  };
  const result = annual(10_000, 3_000, 4_000, 1_200, {
    below_100_fpl_status: eligibility,
  });
  assertEquals(fields(result, "form8962")?.federal_poverty_pct, 66);
  assertEquals(fields(result, "form8962")?.applicable_figure, 0);
  assertEquals(fields(result, "form8962")?.total_premium_tax_credit, 3_000);
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 1_800);
  assertThrows(
    () =>
      annual(10_000, 3_000, 4_000, 0, {
        below_100_fpl_status: eligibility,
      }),
    Error,
    "marketplace-estimate route requires paid APTC",
  );
});

Deno.test("below 100% FPL lawful-presence eligibility does not require APTC", () => {
  const result = annual(10_000, 3_000, 4_000, 0, {
    below_100_fpl_status: {
      basis: "lawfully_present",
      no_one_can_claim_taxpayer: true,
      marketplace_coverage: true,
      enrolled_individual_lawfully_present: true,
      medicaid_ineligible_due_to_immigration_status: true,
      otherwise_applicable_taxpayer: true,
    },
  });
  assertEquals(fields(result, "form8962")?.total_premium_tax_credit, 3_000);
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 3_000);
});

Deno.test("below 100% FPL route refuses incomplete eligibility facts", () => {
  assertThrows(
    () =>
      annual(10_000, 3_000, 4_000, 1_200, {
        below_100_fpl_status: {
          basis: "marketplace_estimate",
          no_one_can_claim_taxpayer: true,
          marketplace_coverage: true,
          marketplace_estimated_at_least_100_fpl: true,
          otherwise_applicable_taxpayer: true,
        },
      }),
    Error,
    "marketplace_information_provided_in_good_faith",
  );
});

Deno.test("below 100% FPL non-applicable taxpayer repays APTC up to Table 5 cap", () => {
  const status = nonApplicableBelowFpl;
  const result = annual(10_000, 3_000, 4_000, 3_000, {
    below_100_fpl_status: status,
  });
  const form = fields(result, "form8962");
  assertEquals(form?.total_premium_tax_credit, 0);
  assertEquals(form?.total_advance_ptc, 3_000);
  assertEquals(form?.applicable_figure, undefined);
  assertEquals(form?.annual_premium, undefined);
  assertEquals(form?.annual_slcsp, undefined);
  assertEquals(form?.annual_aptc, 3_000);
  assertEquals(form?.repayment_limitation, 375);
  assertEquals(fields(result, "schedule3"), undefined);
  assertEquals(fields(result, "schedule2")?.line1a_excess_advance_premium, 375);
  assertEquals(fields(result, "form6251")?.schedule2_line1z_tax, 375);
  const noFiling = annual(10_000, 3_000, 4_000, 0, {
    below_100_fpl_status: status,
  });
  assertEquals(fields(noFiling, "form8962")?.filing_required, false);
  assertEquals(noFiling.outputs.length, 1);
});

Deno.test("below 100% FPL repayment-only monthly rows contain APTC only", () => {
  const result = compute({
    household_size: 1,
    taxpayer_modified_agi: 10_000,
    monthly_aptcs: [200, 200, ...Array(10).fill(0)],
    below_100_fpl_status: nonApplicableBelowFpl,
  });
  const form = fields(result, "form8962");
  assertEquals(form?.total_premium_tax_credit, 0);
  assertEquals(form?.repayment_limitation, 375);
  assertEquals(form?.excess_advance_premium, 375);
  assertEquals((form?.monthly_ptc_rows as unknown[])?.length, 12);
  assertEquals((form?.monthly_ptc_rows as { aptc: number }[])[0].aptc, 200);
  assertEquals(form?.annual_aptc, undefined);
});

Deno.test("below 100% FPL APTC-only annual route needs line 11 coverage proof", () => {
  assertThrows(
    () =>
      compute({
        household_size: 1,
        taxpayer_modified_agi: 10_000,
        annual_aptc: 1_000,
        below_100_fpl_status: nonApplicableBelowFpl,
      }),
    Error,
    "APTC-only annual line 11 needs verified full-year unchanged coverage",
  );
});

Deno.test("below 100% FPL repayment route requires reviewed exceptions", () => {
  assertThrows(
    () =>
      annual(10_000, 3_000, 4_000, 1_000, {
        below_100_fpl_status: { basis: "not_applicable" },
      }),
    Error,
    "exception_routes_reviewed",
  );
  assertThrows(
    () =>
      annual(10_000, 3_000, 4_000, 1_000, {
        below_100_fpl_status: {
          ...nonApplicableBelowFpl,
          all_covered_individuals_lawfully_present: false,
        },
      }),
    Error,
    "all_covered_individuals_lawfully_present",
  );
});

Deno.test("Alaska and Hawaii use their 2024 poverty tables for TY2025", () => {
  const alaska = annual(30_000, 6_000, 6_000, 0, { fpl_region: "alaska" });
  const hawaii = annual(30_000, 6_000, 6_000, 0, { fpl_region: "hawaii" });
  assertEquals(fields(alaska, "form8962")?.federal_poverty_line, 18_810);
  assertEquals(fields(alaska, "form8962")?.federal_poverty_pct, 159);
  assertEquals(fields(hawaii, "form8962")?.federal_poverty_line, 17_310);
  assertEquals(fields(hawaii, "form8962")?.federal_poverty_pct, 173);
});

Deno.test("monthly calculation reports twelve rows and reconciles its line 24", () => {
  const result = compute({
    household_size: 2,
    taxpayer_modified_agi: 40_880,
    monthly_premiums: Array(12).fill(500),
    monthly_slcsps: Array(12).fill(600),
    monthly_aptcs: Array(12).fill(100),
  });
  const form = fields(result, "form8962");
  assertEquals(form?.monthly_applicable_contribution, 68);
  assertEquals((form?.monthly_ptc_rows as unknown[])?.length, 12);
  assertEquals(form?.total_premium_tax_credit, 6_000);
  assertEquals(form?.total_advance_ptc, 1_200);
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 4_800);
});

Deno.test("annual QSEHRA is refused until monthly affordability can be checked", () => {
  assertThrows(
    () =>
      annual(22_590, 6_000, 6_000, 0, {
        qsehra_amount_offered: 3_000,
      }),
    Error,
    "QSEHRA needs monthly affordability and benefit facts",
  );
});

Deno.test("marketplace credit cannot be computed without household facts", () => {
  assertThrows(
    () =>
      form8962.compute(context, { annual_premium: 5_000, annual_slcsp: 5_000 }),
    Error,
    "requires taxpayer modified AGI, family size, FPL region, and filing status",
  );
});

Deno.test("monthly calculation refuses incomplete 1095-A columns", () => {
  assertThrows(
    () =>
      compute({
        household_size: 1,
        taxpayer_modified_agi: 30_000,
        monthly_premiums: Array(12).fill(500),
      }),
    Error,
    "needs all three 1095-A columns",
  );
});

Deno.test("monthly QSEHRA is refused until monthly affordability can be checked", () => {
  assertThrows(
    () =>
      compute({
        household_size: 1,
        taxpayer_modified_agi: 30_000,
        monthly_premiums: Array(12).fill(500),
        monthly_slcsps: Array(12).fill(500),
        monthly_aptcs: Array(12).fill(0),
        qsehra_amount_offered: 1_200,
      }),
    Error,
    "QSEHRA needs monthly affordability and benefit facts",
  );
});

Deno.test("QSEHRA monthly Worksheet N/Q uses self-only affordability and the actual benefit", () => {
  const qsehraMonths = Array(12).fill(null);
  qsehraMonths[0] = {
    self_only_slcsp: 500,
    self_only_permitted_benefit: 100,
    permitted_benefit: 100,
  };
  qsehraMonths[1] = {
    self_only_slcsp: 350,
    self_only_permitted_benefit: 100,
    permitted_benefit: 100,
  };
  const result = compute({
    household_size: 2,
    taxpayer_modified_agi: 40_880,
    monthly_premiums: Array(12).fill(500),
    monthly_slcsps: Array(12).fill(600),
    monthly_aptcs: Array(12).fill(100),
    qsehra_amount_offered: 200,
    qsehra_w2_reported_benefit: 200,
    qsehra_monthly_facts: qsehraMonths,
  });
  const form = fields(result, "form8962");
  const rows = form?.monthly_ptc_rows as { allowed_credit: number }[];
  assertEquals(rows[0].allowed_credit, 400);
  assertEquals(rows[1].allowed_credit, 0);
  assertEquals(rows[2].allowed_credit, 500);
  assertEquals(form?.total_premium_tax_credit, 5_400);
  assertEquals(form?.qsehra_ind, true);
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 4_200);
});

Deno.test("QSEHRA monthly benefits must match the reported annual permitted benefit", () => {
  const qsehraMonths = Array(12).fill(null);
  qsehraMonths[0] = {
    self_only_slcsp: 500,
    self_only_permitted_benefit: 100,
    permitted_benefit: 100,
  };
  assertThrows(
    () =>
      compute({
        household_size: 2,
        taxpayer_modified_agi: 40_880,
        monthly_premiums: Array(12).fill(500),
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(100),
        qsehra_amount_offered: 200,
        qsehra_monthly_facts: qsehraMonths,
      }),
    Error,
    "must reconcile to the annual permitted benefit",
  );
});

Deno.test("QSEHRA employer facts must reconcile with W-2 code FF", () => {
  assertThrows(
    () =>
      compute({
        household_size: 2,
        taxpayer_modified_agi: 40_880,
        monthly_premiums: Array(12).fill(500),
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(100),
        qsehra_amount_offered: 200,
        qsehra_w2_reported_benefit: 300,
      }),
    Error,
    "benefit disagrees with W-2 code FF",
  );
});

Deno.test("annual line 11 QSEHRA omits Form 8962 when every month is affordable and APTC is zero", () => {
  const facts = Array(12).fill({
    self_only_slcsp: 350,
    self_only_permitted_benefit: 100,
    permitted_benefit: 100,
  });
  const result = annual(40_880, 6_000, 7_200, 0, {
    household_size: 2,
    qsehra_amount_offered: 1_200,
    qsehra_monthly_facts: facts,
  });
  assertEquals(fields(result, "form8962")?.filing_required, false);
  assertEquals(result.outputs.length, 1);
});

Deno.test("annual line 11 QSEHRA keeps APTC repayment when every month is affordable", () => {
  const facts = Array(12).fill({
    self_only_slcsp: 350,
    self_only_permitted_benefit: 100,
    permitted_benefit: 100,
  });
  const result = annual(40_880, 6_000, 7_200, 1_200, {
    household_size: 2,
    qsehra_amount_offered: 1_200,
    qsehra_monthly_facts: facts,
  });
  const form = fields(result, "form8962");
  assertEquals(form?.annual_ptc_allowed, 0);
  assertEquals(form?.annual_aptc, 1_200);
  assertEquals(form?.qsehra_ind, true);
  assertEquals(fields(result, "schedule2")?.line1a_excess_advance_premium, 975);
});

Deno.test("annual line 11 QSEHRA preserves the non-QSEHRA months", () => {
  const facts = Array.from({ length: 12 }, (_, index) =>
    index < 6
      ? {
        self_only_slcsp: 350,
        self_only_permitted_benefit: 100,
        permitted_benefit: 100,
      }
      : null);
  const result = annual(40_880, 6_000, 7_200, 0, {
    household_size: 2,
    qsehra_amount_offered: 600,
    qsehra_monthly_facts: facts,
  });
  const form = fields(result, "form8962");
  assertEquals(form?.annual_ptc_allowed, 3_000);
  assertEquals(form?.total_premium_tax_credit, 3_000);
});

Deno.test("annual line 11 QSEHRA reduces an unaffordable full-year benefit", () => {
  const facts = Array(12).fill({
    self_only_slcsp: 500,
    self_only_permitted_benefit: 100,
    permitted_benefit: 100,
  });
  const result = annual(40_880, 6_000, 7_200, 0, {
    household_size: 2,
    qsehra_amount_offered: 1_200,
    qsehra_monthly_facts: facts,
  });
  assertEquals(fields(result, "form8962")?.annual_ptc_allowed, 4_800);
});

Deno.test("QSEHRA and the same 1095-A columns support annual line 11 or monthly lines 12-23", () => {
  const qsehraMonths = Array.from({ length: 12 }, (_, index) =>
    index < 6
      ? {
        self_only_slcsp: 500,
        self_only_permitted_benefit: 100,
        permitted_benefit: 100,
      }
      : null);
  const source = {
    household_size: 2,
    taxpayer_modified_agi: 40_880,
    annual_premium: 6_000,
    annual_slcsp: 7_200,
    annual_aptc: 1_200,
    monthly_premiums: Array(12).fill(500),
    monthly_slcsps: Array(12).fill(600),
    monthly_aptcs: Array(12).fill(100),
    qsehra_amount_offered: 600,
    qsehra_w2_reported_benefit: 600,
    qsehra_monthly_facts: qsehraMonths,
  };
  const annualForm = fields(
    compute({ ...source, annual_line11_eligible: true }),
    "form8962",
  );
  const monthlyForm = fields(
    compute({ ...source, annual_line11_eligible: false }),
    "form8962",
  );
  assertEquals(annualForm?.annual_ptc_allowed, 5_400);
  assertEquals(annualForm?.monthly_ptc_rows, undefined);
  assertEquals(monthlyForm?.annual_ptc_allowed, undefined);
  assertEquals(
    (monthlyForm?.monthly_ptc_rows as { allowed_credit: number }[])
      .map((row) => row.allowed_credit),
    [...Array(6).fill(400), ...Array(6).fill(500)],
  );
  assertEquals(annualForm?.total_premium_tax_credit, 5_400);
  assertEquals(monthlyForm?.total_premium_tax_credit, 5_400);
  assertEquals(annualForm?.qsehra_ind, true);
  assertEquals(monthlyForm?.qsehra_ind, true);
});

Deno.test("QSEHRA annual Worksheet Q Part III handles affordable and unaffordable months", () => {
  const facts = Array.from({ length: 12 }, (_, index) =>
    index < 3
      ? {
        self_only_slcsp: 350,
        self_only_permitted_benefit: 100,
        permitted_benefit: 100,
      }
      : index < 6
      ? {
        self_only_slcsp: 500,
        self_only_permitted_benefit: 100,
        permitted_benefit: 100,
      }
      : null);
  const form = fields(
    annual(40_880, 6_000, 7_200, 0, {
      household_size: 2,
      qsehra_amount_offered: 600,
      qsehra_monthly_facts: facts,
    }),
    "form8962",
  );
  assertEquals(form?.annual_ptc_allowed, 4_200);
  assertEquals(form?.qsehra_ind, true);
});

Deno.test("combined annual and monthly 1095-A columns must reconcile before QSEHRA calculation", () => {
  assertThrows(
    () =>
      compute({
        household_size: 2,
        taxpayer_modified_agi: 40_880,
        annual_premium: 6_001,
        monthly_premiums: Array(12).fill(500),
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(0),
        annual_line11_eligible: true,
      }),
    Error,
    "annual premium must reconcile to twelve monthly 1095-A amounts",
  );
});

Deno.test("QSEHRA cannot use annual line 11 when Marketplace premium changes during the year", () => {
  const facts = Array.from({ length: 12 }, (_, index) =>
    index < 6
      ? {
        self_only_slcsp: 500,
        self_only_permitted_benefit: 100,
        permitted_benefit: 100,
      }
      : null);
  const premiums = [...Array(6).fill(500), ...Array(6).fill(600)];
  const source = {
    household_size: 2,
    taxpayer_modified_agi: 40_880,
    annual_premium: 6_600,
    annual_slcsp: 7_200,
    annual_aptc: 0,
    monthly_premiums: premiums,
    monthly_slcsps: Array(12).fill(600),
    monthly_aptcs: Array(12).fill(0),
    qsehra_amount_offered: 600,
    qsehra_monthly_facts: facts,
  };
  assertThrows(
    () => compute({ ...source, annual_line11_eligible: true }),
    Error,
    "line 11 requires twelve months of unchanged enrollment premium and applicable SLCSP",
  );
  const monthlyForm = fields(compute(source), "form8962");
  assertEquals(monthlyForm?.annual_ptc_allowed, undefined);
  assertEquals(
    (monthlyForm?.monthly_ptc_rows as { allowed_credit: number }[]).length,
    12,
  );
  assertEquals(monthlyForm?.total_premium_tax_credit, 5_592);
});

Deno.test("Form 8962 line 11 also refuses changing SLCSP or part-year Marketplace coverage", () => {
  for (
    const [premiums, slcsps] of [
      [Array(12).fill(500), [...Array(6).fill(600), ...Array(6).fill(650)]],
      [[...Array(11).fill(500), 0], Array(12).fill(600)],
    ]
  ) {
    assertThrows(
      () =>
        compute({
          household_size: 2,
          taxpayer_modified_agi: 40_880,
          monthly_premiums: premiums,
          monthly_slcsps: slcsps,
          monthly_aptcs: Array(12).fill(0),
          annual_line11_eligible: true,
        }),
      Error,
      "line 11 requires twelve months of unchanged enrollment premium and applicable SLCSP",
    );
  }
});

Deno.test("MFS cannot claim PTC without verified exception and allocation facts", () => {
  assertThrows(
    () =>
      annual(22_590, 4_000, 4_000, 0, {
        filing_status: FilingStatus.MFS,
      }),
    Error,
    "MFS needs verified exception and policy-allocation facts",
  );
  assertThrows(
    () =>
      annual(22_590, 4_000, 4_000, 10_000, {
        filing_status: FilingStatus.MFS,
      }),
    Error,
    "MFS needs verified exception and policy-allocation facts",
  );
});

Deno.test("MFS without exception files APTC-only repayment subject to Table 5", () => {
  const result = annual(30_000, 4_000, 4_000, 5_000, {
    filing_status: FilingStatus.MFS,
    mfs_ptc_status: mfsNoException,
  });
  const form = fields(result, "form8962");
  assertEquals(form?.total_premium_tax_credit, 0);
  assertEquals(form?.annual_aptc, 5_000);
  assertEquals(form?.annual_premium, undefined);
  assertEquals(form?.mfs_exception_ind, undefined);
  assertEquals(form?.repayment_limitation, 750);
  assertEquals(fields(result, "schedule2")?.line1a_excess_advance_premium, 750);
  assertEquals(fields(result, "schedule3"), undefined);
  assertEquals(
    annual(30_000, 4_000, 4_000, 0, {
      filing_status: FilingStatus.MFS,
      mfs_ptc_status: mfsNoException,
    }).outputs,
    [{ nodeType: "form8962", fields: { filing_required: false } }],
  );
  assertThrows(
    () =>
      annual(30_000, 4_000, 4_000, 5_000, {
        filing_status: FilingStatus.MFS,
        mfs_ptc_status: {
          ...mfsNoException,
          policy_scope: "shared_with_spouse",
        },
      }),
    Error,
    "shared policy allocation",
  );
});

Deno.test("MFS APTC-only repayment has no Table 5 cap at 400% FPL", () => {
  const result = annual(70_000, 4_000, 4_000, 5_000, {
    filing_status: FilingStatus.MFS,
    mfs_ptc_status: mfsNoException,
  });
  const form = fields(result, "form8962");
  assertEquals(form?.federal_poverty_pct, 401);
  assertEquals(form?.repayment_limitation, undefined);
  assertEquals(
    fields(result, "schedule2")?.line1a_excess_advance_premium,
    5_000,
  );
});

Deno.test("MFS without exception reports monthly APTC without PTC columns", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    household_size: 1,
    taxpayer_modified_agi: 30_000,
    monthly_aptcs: Array(12).fill(100),
    mfs_ptc_status: mfsNoException,
  });
  const form = fields(result, "form8962");
  assertEquals(form?.total_premium_tax_credit, 0);
  const rows = form?.monthly_ptc_rows as { month_code: string; aptc: number }[];
  assertEquals(rows.length, 12);
  assertEquals(rows[0], { month_code: "JANUARY", aptc: 100 });
  assertEquals(fields(result, "schedule2")?.line1a_excess_advance_premium, 750);
});

Deno.test("MFS shared policy without exception reports Part IV and half APTC", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    household_size: 1,
    taxpayer_modified_agi: 30_000,
    monthly_aptcs: Array(12).fill(400),
    mfs_ptc_status: {
      ...mfsNoException,
      policy_scope: "shared_with_spouse",
    },
    shared_policy_allocations: [sharedMfsAllocation],
  });
  const form = fields(result, "form8962");
  assertEquals(form?.shared_policy_allocations, [sharedMfsAllocation]);
  assertEquals(form?.total_advance_ptc, 4_800);
  assertEquals(fields(result, "schedule2")?.line1a_excess_advance_premium, 750);
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.MFS,
        household_size: 1,
        taxpayer_modified_agi: 30_000,
        monthly_aptcs: Array(12).fill(400),
        mfs_ptc_status: mfsNoException,
        shared_policy_allocations: [sharedMfsAllocation],
      }),
    Error,
    "family-only MFS status conflicts",
  );
});

Deno.test("MFS abuse exception can claim PTC and marks Form 8962 line A", () => {
  const status = {
    basis: "domestic_abuse",
    living_apart_at_filing: true,
    unable_to_file_joint_due_to_exception: true,
    prior_consecutive_exception_years: 0,
    no_one_can_claim_taxpayer: true,
    policy_scope: "family_only",
  };
  const result = annual(30_000, 6_000, 7_200, 1_200, {
    filing_status: FilingStatus.MFS,
    mfs_ptc_status: status,
  });
  const form = fields(result, "form8962");
  assertEquals(form?.mfs_exception_ind, true);
  assertEquals(form?.total_premium_tax_credit, 6_000);
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 4_800);
  assertThrows(
    () =>
      annual(30_000, 6_000, 7_200, 1_200, {
        filing_status: FilingStatus.MFS,
        mfs_ptc_status: {
          ...status,
          prior_consecutive_exception_years: 3,
        },
      }),
    Error,
    "prior_consecutive_exception_years",
  );
  const abandonment = annual(30_000, 6_000, 7_200, 1_200, {
    filing_status: FilingStatus.MFS,
    mfs_ptc_status: {
      ...status,
      basis: "spousal_abandonment",
      prior_consecutive_exception_years: 2,
    },
  });
  assertEquals(fields(abandonment, "form8962")?.mfs_exception_ind, true);
});

Deno.test("MFS shared-policy exception uses separately determined family SLCSP", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    household_size: 1,
    taxpayer_modified_agi: 30_000,
    monthly_premiums: Array(12).fill(600),
    monthly_slcsps: Array(12).fill(700),
    monthly_aptcs: Array(12).fill(400),
    mfs_ptc_status: {
      basis: "spousal_abandonment",
      living_apart_at_filing: true,
      unable_to_file_joint_due_to_exception: true,
      prior_consecutive_exception_years: 0,
      no_one_can_claim_taxpayer: true,
      policy_scope: "shared_with_spouse",
    },
    shared_policy_allocations: [{
      ...sharedMfsAllocation,
      basis: "mfs_exception",
      premium_pct: 0.5,
    }],
  });
  const form = fields(result, "form8962");
  assertEquals(form?.mfs_exception_ind, true);
  assertEquals(form?.total_premium_tax_credit, 7_200);
  assertEquals(form?.total_advance_ptc, 4_800);
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 2_400);
});

Deno.test("divorce allocation can report all three agreed percentages", () => {
  const allocation = {
    basis: "divorce_agreed",
    policy_number: "DIV-POLICY-1",
    other_taxpayer_ssn: "222334444",
    start_month: 1,
    end_month: 1,
    premium_pct: 0.67,
    slcsp_pct: 0.67,
    aptc_pct: 0.67,
  };
  const result = compute({
    household_size: 1,
    taxpayer_modified_agi: 30_000,
    monthly_premiums: [804, ...Array(11).fill(0)],
    monthly_slcsps: [1_005, ...Array(11).fill(0)],
    monthly_aptcs: [536, ...Array(11).fill(0)],
    shared_policy_allocations: [allocation],
  });
  assertEquals(fields(result, "form8962")?.shared_policy_allocations, [
    allocation,
  ]);
  assertEquals(fields(result, "form8962")?.total_advance_ptc, 536);
});

Deno.test("zero-percent shared allocation still produces Form 8962 Part IV", () => {
  const allocation = {
    basis: "other_agreed",
    policy_number: "OTHER-POLICY-1",
    other_taxpayer_ssn: "222334444",
    start_month: 1,
    end_month: 1,
    premium_pct: 0,
    slcsp_pct: 0,
    aptc_pct: 0,
  };
  const result = compute({
    household_size: 1,
    taxpayer_modified_agi: 30_000,
    monthly_premiums: Array(12).fill(0),
    monthly_slcsps: Array(12).fill(0),
    monthly_aptcs: Array(12).fill(0),
    shared_policy_allocations: [allocation],
  });
  assertEquals(fields(result, "form8962")?.shared_policy_allocations, [
    allocation,
  ]);
  assertEquals(fields(result, "form8962")?.total_premium_tax_credit, 0);
});
