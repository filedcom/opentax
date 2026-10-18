import { FilingStatus } from "../../nodes/types.ts";
import {
  DependentRelationship,
  IRSDependentRelationshipCode,
} from "../../nodes/inputs/general/filing/general/index.ts";
import type { Ty2026PacketTarget } from "./ty2026-ats.ts";
import type { W2Target } from "./ty2025-w2-value-coverage.ts";

/**
 * TY2026 Form 1040 ATS Scenario 14 (8 pages): page 1 cover, 2-3 Form 1040,
 * 4 Schedule 3-A, 5 Schedule EIC, 6-7 Schedule 8812, 8 W-2.
 * https://www.irs.gov/pub/irs-efile/ty26-1040-ats-scenario-14.pdf
 */
const PACKET = "irs-ty2026-ats-1040-14";

export const SCENARIO_1040_14_TY2026_FACTS = {
  // Page 2.
  taxpayer: {
    firstName: "John",
    lastName: "Rosen",
    ssn: "400001414",
    address: {
      line1: "123 Chestnut Drive",
      city: "Buffalo",
      state: "NY",
      zip: "14240",
    },
    filingStatus: "single",
    digitalAssets: false,
  },
  // Page 2 dependents, with page 5 Schedule EIC birth years and months.
  dependents: [
    {
      firstName: "George",
      lastName: "Rosen",
      ssn: "400001401",
      relationship: "son",
      birthYear: 2016,
      monthsInUs: 12,
    },
    {
      firstName: "Abigail",
      lastName: "Rosen",
      ssn: "400001402",
      relationship: "daughter",
      birthYear: 2017,
      monthsInUs: 12,
    },
  ],
  // Page 8.
  w2: {
    employerName: "Willow Farms",
    employerEin: "000000014",
    employerAddress: {
      line1: "195 Poplar Street",
      city: "Buffalo",
      state: "NY",
      zip: "14240",
    },
    employeeSsn: "400001414",
    box1Wages: 35_000,
    box2FederalWithholding: 2_000,
    box3SocialSecurityWages: 35_000,
    box4SocialSecurityWithholding: 2_170,
    box5MedicareWages: 35_000,
    box6MedicareWithholding: 508,
  },
} as const;

/** Facts a guard requires that the packet does not print. None changes tax. */
export const SCENARIO_1040_14_TY2026_ASSUMPTIONS = [
  {
    field: "general.taxpayer_dob",
    value: "1990-01-01",
    why:
      "The packet prints no birth date; line 12d 'born before January 2, 1962' is unchecked.",
  },
  {
    field: "general.taxpayer_prior_year_agi",
    value: 0,
    why: "The packet gives no 2025 AGI for the Self-Select PIN signature.",
  },
  {
    field: "general.ats_test_submission",
    value: true,
    why: "Marks the ATS test return so the 00 SSN and EIN test prefixes apply.",
  },
  {
    field: "dependents[].dob",
    value: "January 1 of the Schedule EIC line 3 birth year",
    why:
      "Schedule EIC prints only birth years 2016 and 2017; either child is under 17 at the end of 2026 on any date that year.",
  },
  {
    field:
      "dependents[] SSN validity, citizenship, support, joint return and other-return answers",
    value: true,
    why:
      "Page 2 checks the child tax credit box for both children and page 6 counts both on line 4, which requires these facts.",
  },
  {
    field: "general EIC reviews (SSN, prior disallowance, residency)",
    value: "no prior disallowance, all-year U.S. resident",
    why:
      "The packet claims EIC on line 27a without Form 8862, and Schedule EIC line 6 gives 12 months in the U.S.; records are named for the packet pages.",
  },
  {
    field: "f8812_credit_limit_worksheet",
    value: "all Schedule 3 credit lines 0",
    why: "The return has no Schedule 3.",
  },
  {
    field: "f8812_earned_income_worksheet",
    value: "W-2 wages $35,000, every other line 0",
    why:
      "Schedule 8812 line 18a prints $35,000, all of it W-2 box 1 wages (page 8).",
  },
  {
    field: "w2[0].source_document_reference",
    value: `${PACKET}-w2-page-8`,
    why: "The issued-copy reference names the packet page of the W-2.",
  },
] as const;

const conflict = (
  page: number,
  line: string,
  printed: number,
  current: number,
  why: string,
) => ({ page, line, printed, current, why });
const TAX_TABLE =
  "Taxable income under $100,000 takes the Tax Table amount for its $50 row midpoint ($18,925): $1,240 + 12% x ($18,925 - $12,400) = $2,023 (Rev. Proc. 2025-32 §4.01 Table 3); the packet prints the exact-income $2,020.";
const EIC =
  "Rev. Proc. 2025-32 §4.06 for 2026, two children: $7,316 - 21.06% x ($35,025 - $23,890) = $4,971. The packet's $4,693 is the TY2025 EIC Table amount ($7,152 and $23,350, Rev. Proc. 2024-40 §2.06).";

/** Printed packet values that differ from 2026 law; each follows from the tax or EIC above. */
export const SCENARIO_1040_14_TY2026_RECONCILIATION = {
  conflicts: [
    conflict(3, "1040 line 16", 2_020, 2_023, TAX_TABLE),
    conflict(3, "1040 line 18", 2_020, 2_023, TAX_TABLE),
    conflict(3, "1040 line 19", 2_020, 2_023, TAX_TABLE),
    conflict(3, "1040 line 21", 2_020, 2_023, TAX_TABLE),
    conflict(6, "Schedule 8812 line 13", 2_020, 2_023, TAX_TABLE),
    conflict(6, "Schedule 8812 line 14", 2_020, 2_023, TAX_TABLE),
    conflict(7, "Schedule 8812 line 16a", 2_380, 2_377, TAX_TABLE),
    conflict(7, "Schedule 8812 line 17", 2_380, 2_377, TAX_TABLE),
    conflict(7, "Schedule 8812 line 27", 2_380, 2_377, TAX_TABLE),
    conflict(3, "1040 line 28", 2_380, 2_377, TAX_TABLE),
    conflict(3, "1040 line 27a", 4_693, 4_971, EIC),
    conflict(3, "1040 line 32a", 7_073, 7_348, `${EIC} ${TAX_TABLE}`),
    conflict(3, "1040 line 33", 9_073, 9_348, `${EIC} ${TAX_TABLE}`),
    conflict(3, "1040 line 34", 9_073, 9_348, `${EIC} ${TAX_TABLE}`),
    conflict(3, "1040 line 35a", 9_073, 9_348, `${EIC} ${TAX_TABLE}`),
  ],
  notes: [
    "Schedule 3-A page 4 line 1a prints $5,141 although it is defined as 1040 line 32a, printed $7,073 on page 3.",
  ],
} as const;

const value = (
  page: number,
  line: string,
  path: string | null,
  expected: number | string,
): Ty2026PacketTarget => ({ page, line, path, expected });
const f1040 = (
  page: number,
  line: string,
  element: string | null,
  expected: number,
) => value(page, `1040 line ${line}`, element && `IRS1040/${element}`, expected);
const s8812 = (page: number, line: string, element: string, expected: number) =>
  value(page, `Schedule 8812 line ${line}`, `IRS1040Schedule8812/${element}`, expected);
const s3a = (line: string, expected: number) =>
  value(4, `Schedule 3-A line ${line}`, null, expected);
const child = (index: number, element: string, expected: number | string) =>
  value(
    5,
    `Schedule EIC child ${index + 1} ${element}`,
    `IRS1040ScheduleEIC/QualifyingChildInformation[${index}]/${element}`,
    expected,
  );

/** Every amount the packet prints, by the MeF element that carries it; null has no 2026v1.0 element. */
export const SCENARIO_1040_14_TY2026_TARGETS: readonly Ty2026PacketTarget[] = [
  f1040(2, "1a", "WagesAmt", 35_000),
  f1040(2, "1z", "WagesSalariesAndTipsAmt", 35_000),
  f1040(2, "9", "TotalIncomeAmt", 35_000),
  f1040(2, "11a", "AdjustedGrossIncomeAmt", 35_000),
  f1040(3, "11b", null, 35_000),
  f1040(3, "12e", "TotalItemizedOrStandardDedAmt", 16_100),
  f1040(3, "14", "TotalDeductionsAmt", 16_100),
  f1040(3, "15", "TaxableIncomeAmt", 18_900),
  f1040(3, "16", "TaxAmt", 2_020),
  f1040(3, "18", "TotalTaxBeforeCrAndOthTaxesAmt", 2_020),
  f1040(3, "19", "CTCODCAmt", 2_020),
  f1040(3, "21", "TotalCreditsAmt", 2_020),
  f1040(3, "22", "TaxLessCreditsAmt", 0),
  f1040(3, "24a", "TotalTaxAmt", 0),
  f1040(3, "24c", null, 0),
  f1040(3, "25a", "FormW2WithheldTaxAmt", 2_000),
  f1040(3, "25d", "WithholdingTaxAmt", 2_000),
  f1040(3, "27a", "EarnedIncomeCreditAmt", 4_693),
  f1040(3, "28", "AdditionalChildTaxCreditAmt", 2_380),
  f1040(3, "32a", "RefundableCreditsAmt", 7_073),
  f1040(3, "32b", null, 0),
  f1040(3, "32c", null, 7_073),
  f1040(3, "33", "TotalPaymentsAmt", 9_073),
  f1040(3, "34", "OverpaidAmt", 9_073),
  f1040(3, "35a", "RefundAmt", 9_073),
  s3a("1a", 5_141),
  s3a("1b", 0),
  s3a("2", 5_141),
  s3a("3", 0),
  s3a("4", 0),
  s3a("5", 0),
  s3a("6", 5_141),
  s3a("8", 0),
  ...SCENARIO_1040_14_TY2026_FACTS.dependents.flatMap((d, i) => [
    child(i, "QualifyingChildSSN", d.ssn),
    child(i, "ChildBirthYr", d.birthYear),
    child(i, "MonthsChildLivedWithYouCnt", d.monthsInUs),
  ]),
  s8812(6, "1", "AdjustedGrossIncomeAmt", 35_000),
  s8812(6, "3", "ModifiedAGIAmt", 35_000),
  s8812(6, "4", "QlfyChildUnderAgeSSNCnt", 2),
  s8812(6, "5", "QlfyChildUnderAgeSSNLimtAmt", 4_400),
  s8812(6, "8", "InitialCTCODCAmt", 4_400),
  s8812(6, "9", "FilingStatusThresholdCd", 200_000),
  s8812(6, "10", "ExcessAdjGrossIncomeAmt", 0),
  s8812(6, "11", "ModifiedAGIPhaseOutAmt", 0),
  s8812(6, "12", "CTCODCAfterAGILimitAmt", 4_400),
  s8812(6, "13", "ACTCTaxLiabiltyLimitAmt", 2_020),
  s8812(6, "14", "CTCODCAmt", 2_020),
  s8812(7, "16a", "ClaimACTCAllFilersGrp/ACTCBeforeLimitAmt", 2_380),
  s8812(7, "16b count", "ClaimACTCAllFilersGrp/QlfyChildUnderAgeSSNCnt", 2),
  s8812(7, "16b", "ClaimACTCAllFilersGrp/QlfyChildUnderAgeSSNLimtAmt", 3_400),
  s8812(7, "17", "ClaimACTCAllFilersGrp/ACTCAfterLimitAmt", 2_380),
  s8812(7, "18a", "ClaimACTCAllFilersGrp/TotalEarnedIncomeAmt", 35_000),
  s8812(7, "19", "ClaimACTCAllFilersGrp/NetTotalEarnedIncomeAmt", 32_500),
  s8812(7, "20", "ClaimACTCAllFilersGrp/NetEarnedIncomeCalculatedAmt", 4_875),
  s8812(7, "27", "AdditionalChildTaxCreditAmt", 2_380),
];

export const SCENARIO_1040_14_TY2026_W2_TARGETS: readonly W2Target[] = [{
  sourcePage: 8,
  employerName: SCENARIO_1040_14_TY2026_FACTS.w2.employerName,
  fields: {
    EmployeeSSN: SCENARIO_1040_14_TY2026_FACTS.w2.employeeSsn,
    EmployerEIN: SCENARIO_1040_14_TY2026_FACTS.w2.employerEin,
    WagesAmt: SCENARIO_1040_14_TY2026_FACTS.w2.box1Wages,
    WithholdingAmt: SCENARIO_1040_14_TY2026_FACTS.w2.box2FederalWithholding,
    SocialSecurityWagesAmt: SCENARIO_1040_14_TY2026_FACTS.w2
      .box3SocialSecurityWages,
    SocialSecurityTaxAmt: SCENARIO_1040_14_TY2026_FACTS.w2
      .box4SocialSecurityWithholding,
    MedicareWagesAndTipsAmt: SCENARIO_1040_14_TY2026_FACTS.w2.box5MedicareWages,
    MedicareTaxWithheldAmt: SCENARIO_1040_14_TY2026_FACTS.w2
      .box6MedicareWithholding,
    StatutoryEmployeeInd: false,
    RetirementPlanInd: false,
  },
}];

function dependents() {
  return SCENARIO_1040_14_TY2026_FACTS.dependents.map((child) => {
    const son = child.relationship === "son";
    return {
      first_name: child.firstName,
      last_name: child.lastName,
      name_control: child.lastName.slice(0, 4).toUpperCase(),
      irs_relationship_code: son
        ? IRSDependentRelationshipCode.Son
        : IRSDependentRelationshipCode.Daughter,
      ssn: child.ssn,
      ssn_valid_for_employment: true,
      ssn_issued_before_due_date: true,
      tin_issued_by_due_date: true,
      dob: `${child.birthYear}-01-01`,
      relationship: son
        ? DependentRelationship.Son
        : DependentRelationship.Daughter,
      months_in_home: child.monthsInUs,
      months_lived_with_you_in_us: child.monthsInUs,
      lived_in_us_over_half_year: true,
      us_citizen_national_or_resident: true,
      provided_over_half_own_support: false,
      filed_joint_return_except_refund_only: false,
      qualifying_child_for_ctc: true,
      dependent_on_another_return: false,
    };
  });
}

/** Official IRS TY2026 1040 ATS Scenario 14 packet. */
export function ty2026Scenario104014Input(): Record<string, unknown> {
  const { taxpayer, w2 } = SCENARIO_1040_14_TY2026_FACTS;
  return {
    general: {
      ats_test_submission: true,
      filing_status: FilingStatus.Single,
      taxpayer_first_name: taxpayer.firstName,
      taxpayer_last_name: taxpayer.lastName,
      taxpayer_ssn: taxpayer.ssn,
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
      taxpayer_dob: SCENARIO_1040_14_TY2026_ASSUMPTIONS[0].value,
      taxpayer_can_be_claimed_as_dependent: false,
      taxpayer_prior_year_agi: SCENARIO_1040_14_TY2026_ASSUMPTIONS[1].value,
      address_line1: taxpayer.address.line1,
      address_city: taxpayer.address.city,
      address_state: taxpayer.address.state,
      address_zip: taxpayer.address.zip,
      digital_assets: taxpayer.digitalAssets,
      child_eic_filer_review: {
        not_qualifying_child_of_another_taxpayer_verified: true,
        relationship_age_residence_record_reference:
          `${PACKET}-schedule-eic-page-5`,
      },
      prior_eic_disallowance_review: {
        status: "none",
        irs_account_record_reference: `${PACKET}-form1040-page-3-no-form-8862`,
        no_nonclerical_disallowance_since_1996_verified: true,
      },
      eic_tax_residency_review: {
        status: "all_year_resident",
        taxpayer_status_record_reference: `${PACKET}-schedule-eic-page-5`,
      },
      dependents: dependents(),
    },
    w2: [{
      source_document_reference: `${PACKET}-w2-page-8`,
      employer_name: w2.employerName,
      employer_ein: w2.employerEin,
      employee_ssn: w2.employeeSsn,
      employer_address_line1: w2.employerAddress.line1,
      employer_address_city: w2.employerAddress.city,
      employer_address_state: w2.employerAddress.state,
      employer_address_zip: w2.employerAddress.zip,
      box1_wages: w2.box1Wages,
      box2_fed_withheld: w2.box2FederalWithholding,
      box3_ss_wages: w2.box3SocialSecurityWages,
      box4_ss_withheld: w2.box4SocialSecurityWithholding,
      box5_medicare_wages: w2.box5MedicareWages,
      box6_medicare_withheld: w2.box6MedicareWithholding,
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
        worksheet_b_applies: false,
      },
    },
    f8812_earned_income_worksheet: {
      earned_income_worksheet: {
        form1040_line1z_wages: w2.box1Wages,
        nontaxable_combat_pay: 0,
        schedule_c_statutory_employee_income: 0,
        nonfarm_schedule_c_and_k1_net: 0,
        farm_schedule_f_and_k1_net: 0,
        farm_optional_method_used: false,
        excluded_medicaid_waiver_payments: 0,
        schedule1_line15_se_deduction: 0,
      },
    },
  };
}
