import {
  DependentRelationship,
  IRSDependentRelationshipCode,
} from "../../nodes/inputs/general/filing/general/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { mefBusinessNameLine1 } from "../../mef/business-name.ts";
import type { Ty2026PacketTarget } from "./ty2026-ats.ts";
import type { W2Target } from "./ty2025-w2-value-coverage.ts";

/**
 * TY2026 Form 1040 ATS Scenario 4 (18 pages, draft 9/22/2026): page 1 cover,
 * 2-3 Form 1040, 4 W-2, 5-6 Schedule 1 (blank), 7 Schedule 3 (blank), 8
 * Schedule 3-A, 9-10 Form 2441, 11-13 Form 8862, 14-15 Form 8863, 16
 * Schedule EIC, 17-18 Schedule 8812 (blank).
 * https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-4-09222026.pdf
 */
const PACKET = "irs-ty2026-ats-1040-04";

export const SCENARIO_1040_04_TY2026_FACTS = {
  // Page 1 cover and page 2.
  taxpayer: {
    firstName: "Dani",
    lastName: "Lozano",
    ssn: "400001039",
    dateOfBirth: "1997-02-05",
    blind: true,
    fullTimeStudent: true,
    address: {
      line1: "6245 Old Court Road",
      line2: "Apt 202",
      city: "Boca Raton",
      state: "FL",
      zip: "33433",
    },
    // Page 2: HOH, digital assets No, presidential campaign "You"; page 3
    // line 12d "Are blind".
    digitalAssets: false,
    presidentialCampaignFund: true,
  },
  movingExpenses: 1_325,
  adjustedQualifiedEducationExpenses: 890,
  bonaFidePuertoRicoResident: false,
  // Page 2 dependents, page 1 birth dates, page 16 Schedule EIC.
  dependents: [
    {
      firstName: "Drina",
      lastName: "Lozano",
      ssn: "400001057",
      relationship: "daughter",
      dateOfBirth: "2018-07-04",
      monthsInUs: 12,
      careExpenses: 700,
    },
    {
      firstName: "Ezekiel",
      lastName: "Lozano",
      ssn: "400001058",
      relationship: "son",
      dateOfBirth: "2020-01-23",
      monthsInUs: 12,
      careExpenses: 1_600,
    },
  ],
  // Page 4.
  w2: {
    employerName: "Publix Super Market, Inc.",
    employerEin: "000000029",
    employerAddress: {
      line1: "7060 W Palmetto Park Road",
      city: "Boca Raton",
      state: "FL",
      zip: "33433",
    },
    employeeSsn: "400001039",
    box1Wages: 35_545,
    box2FederalWithholding: 3_459,
    box3SocialSecurityWages: 35_545,
    box4SocialSecurityWithholding: 2_204,
    box5MedicareWages: 35_545,
    box6MedicareWithholding: 515,
  },
  // Page 8: lines 6, 7 and 8 "Yes"; every amount blank.
  schedule3A: { line6Yes: true, line7Yes: true, line8Yes: true },
  // Pages 9-10: line B checked; no dependent care benefits; line 23 prints 0.
  form2441: {
    lineBDeemedIncome: true,
    providers: [
      {
        name: "Bloom Academy",
        address: { line1: "10085 Yamato Road", city: "Boca Raton", state: "FL", zip: "33498" },
        ein: "000000041",
        householdEmployee: false,
        amountPaid: 1_600,
      },
      {
        name: "Wildflower Kids",
        address: { line1: "250 NW 20th Street", city: "Boca Raton", state: "FL", zip: "33431" },
        ein: "000000042",
        householdEmployee: false,
        amountPaid: 700,
      },
    ],
    line23: 0,
  },
  // Pages 11-13 (Form 8862, Rev. December 2025): lines 1, 2 and 6 blank;
  // line 3 No, 4 No; 365 days for each child; Part III 14-17 Yes; Part IV
  // student name blank, 19a Yes, 19b No.
  form8862: { daysInUs: 365, studentEligible: true, priorFourYears: false },
  // Pages 14-15.
  form8863: {
    institutionName: "Florida Atlantic University",
    institutionAddress: {
      line1: "777 Glades Road",
      city: "Boca Raton",
      state: "FL",
      zip: "33431",
    },
    institutionEin: "000000004",
    received1098TFor2026: false,
    received1098TFor2025Box7: false,
    aotcClaimedFourPriorYears: false,
    enrolledAtLeastHalfTime: true,
    completedFirstFourYears: false,
    felonyDrugConviction: false,
  },
} as const;

const F = SCENARIO_1040_04_TY2026_FACTS;
const AGI = F.w2.box1Wages;
// Rev. Proc. 2025-32 §4.14: HOH $24,150 plus $2,050 for an unmarried blind
// filer is $26,200; $35,545 - $26,200 = $9,345, Tax Table row $9,300-$9,350
// at 10% of the $9,325 midpoint.
const TAX = 933;
// Form 2441 (2026): 39% for AGI $35,001-$37,000 (IRC §21(a)(2) as amended by
// P.L. 119-21 §70405) x $2,300 = $897, below the $933 tax.
const DEPENDENT_CARE = 897;

/** Facts a guard requires that the packet does not print. None changes tax. */
export const SCENARIO_1040_04_TY2026_ASSUMPTIONS = [
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
    field: "dependents[] SSN validity, citizenship, support, joint return",
    value: true,
    why:
      "Page 2 checks the child tax credit for both children and Form 8862 Part III lines 14-17 answer Yes, which requires these facts.",
  },
  {
    field: "general HOH home costs, EIC filer and residency reviews",
    value: "packet household",
    why:
      "HOH is checked with both children in the home all year (page 2; Schedule EIC page 16; Form 8862 line 7 365 days); records are named for the packet pages.",
  },
  {
    field: "f8862 credits claimed",
    value: "EIC, CTC/ACTC and AOTC",
    why:
      "Form 8862 page 11 line 2 leaves every box blank, but Parts II, III and IV are completed and the return claims each credit.",
  },
  {
    field: "f8862 and general disallowance years and notices",
    value: 2024,
    why:
      "Form 8862 is filed only after a prior disallowance; line 1 and every year are blank, so a 2024 notice is recorded.",
  },
  {
    field: "f8863 missing 1098-T exception and payment detail",
    value: `required_but_not_received; $${F.adjustedQualifiedEducationExpenses} tuition`,
    why:
      "Page 15 line 22a(2) and (3) answer No; the cover gives $890 of adjusted expenses with no breakdown, recorded as tuition.",
  },
  {
    field: "f8863 1098-T request and filing dates",
    value: "requested 2027-02-01, return filed 2027-02-02",
    why:
      "The missing-1098-T exception needs a request after January 31, 2027 and before filing; the packet dates neither.",
  },
  {
    field: "general.address_line1",
    value: "6245 Old Court Road Apt 202",
    why:
      "Page 2 prints the apartment in its own box; IND-055-02 (2026v1.0) bars a header AddressLine2Txt, so the apartment follows the street on line 1.",
  },
  {
    field: "form2441 provider kind",
    value: "business",
    why: "Both providers are daycare centers with EINs, marked not household employees.",
  },
] as const;

/** Packet facts that differ from what the return files under 2026 law. */
export const SCENARIO_1040_04_TY2026_RECONCILIATION = {
  conflicts: [],
  notes: [
    "The cover lists Schedule 1 and gives $1,325 of moving expenses, but Schedule 1 line 14 is blank and the cover lists no Form 3903. For 2026 the moving-expense deduction is limited to Armed Forces members on active duty and intelligence-community employees moving under orders (IRC §217(g), (k) as amended by P.L. 119-21 §70113); the packet gives neither status, so the return deducts nothing and files no Schedule 1.",
    "Form 2441 page 9 checks line B (student deemed income) and the return files it, but Dani's actual earned income ($35,545) exceeds any deemed amount, so line B does not change the credit.",
    "Form 8862 page 11 line 6 (Schedule EIC shows a qualifying child) has neither box marked; Schedule EIC page 16 lists two children.",
  ],
} as const;

const value = (
  page: number,
  line: string,
  path: string | null,
  expected: number | string,
): Ty2026PacketTarget => ({ page, line, path, expected });
const child = (index: number, element: string, expected: number | string) =>
  value(
    16,
    `Schedule EIC child ${index + 1} ${element}`,
    `IRS1040ScheduleEIC/QualifyingChildInformation[${index}]/${element}`,
    expected,
  );

/** Every amount the packet prints, by the MeF element that carries it; null has no 2026v1.0 element. */
export const SCENARIO_1040_04_TY2026_TARGETS: readonly Ty2026PacketTarget[] = [
  value(9, "Form 2441 line B", "IRS2441/StudentOrDisabledInd", "X"),
  ...F.form2441.providers.flatMap((p, i) => [
    value(9, `Form 2441 line 1c provider ${i + 1}`, `IRS2441/CareProviderGrp[${i}]/EIN`, p.ein),
    value(9, `Form 2441 line 1e provider ${i + 1}`, `IRS2441/CareProviderGrp[${i}]/PaidAmt`, p.amountPaid),
  ]),
  ...[F.dependents[1], F.dependents[0]].map((d, i) =>
    value(
      9,
      `Form 2441 line 2(d) ${d.firstName}`,
      `IRS2441/QualifyingPersonGrp[${i}]/QualifiedCareExpensesPaidAmt`,
      d.careExpenses,
    )
  ),
  value(10, "Form 2441 line 23", "IRS2441/PropshpPrtshpLessAdjBnftAmt", F.form2441.line23),
  value(15, "Form 8863 line 22a(4)", "IRS8863/StudentAndEducationalInstnGrp/EducationalInstitutionGroup/EIN", F.form8863.institutionEin),
  ...F.dependents.flatMap((d, i) => [
    child(i, "QualifyingChildSSN", d.ssn),
    child(i, "ChildBirthYr", Number(d.dateOfBirth.slice(0, 4))),
    child(i, "MonthsChildLivedWithYouCnt", d.monthsInUs),
  ]),
  ...["line 6 Yes", "line 7 Yes", "line 8 Yes"].map((line) =>
    value(8, `Schedule 3-A ${line}`, null, "X")
  ),
];

export const SCENARIO_1040_04_TY2026_W2_TARGETS: readonly W2Target[] = [{
  sourcePage: 4,
  employerName: mefBusinessNameLine1(F.w2.employerName),
  fields: {
    EmployeeSSN: F.w2.employeeSsn,
    EmployerEIN: F.w2.employerEin,
    WagesAmt: F.w2.box1Wages,
    WithholdingAmt: F.w2.box2FederalWithholding,
    SocialSecurityWagesAmt: F.w2.box3SocialSecurityWages,
    SocialSecurityTaxAmt: F.w2.box4SocialSecurityWithholding,
    MedicareWagesAndTipsAmt: F.w2.box5MedicareWages,
    MedicareTaxWithheldAmt: F.w2.box6MedicareWithholding,
    StatutoryEmployeeInd: false,
    RetirementPlanInd: false,
  },
}];

function dependents() {
  return F.dependents.map((d) => {
    const son = d.relationship === "son";
    return {
      first_name: d.firstName,
      last_name: d.lastName,
      name_control: d.lastName.slice(0, 4).toUpperCase(),
      irs_relationship_code: son
        ? IRSDependentRelationshipCode.Son
        : IRSDependentRelationshipCode.Daughter,
      ssn: d.ssn,
      ssn_valid_for_employment: true,
      ssn_issued_before_due_date: true,
      tin_issued_by_due_date: true,
      dob: d.dateOfBirth,
      relationship: son
        ? DependentRelationship.Son
        : DependentRelationship.Daughter,
      months_in_home: d.monthsInUs,
      months_lived_with_you_in_us: d.monthsInUs,
      lived_in_us_over_half_year: true,
      us_citizen_national_or_resident: true,
      provided_over_half_own_support: false,
      filed_joint_return_except_refund_only: false,
      qualifying_child_for_ctc: true,
      dependent_on_another_return: false,
      child_care_months: 12,
    };
  });
}

const noticeCopy = (credit: string) => ({
  reference: `${PACKET}-2024-${credit}-notice-copy`,
  text:
    `Assumed retained copy of the 2024 IRS ${credit.toUpperCase()} disallowance notice for TY2026 ATS Scenario 4 (SSN 400-00-1039); the packet does not reproduce it.\n`,
});
const NOTICES = {
  eic: noticeCopy("eic"),
  ctc: noticeCopy("ctc"),
  aotc: noticeCopy("aotc"),
} as const;

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Retained, untransmitted notice copies the Form 8862 export verifies. */
export function ty2026Scenario104004RetainedSourceDocuments() {
  return Object.values(NOTICES).map((copy) => ({
    document_reference: copy.reference,
    bytes: new TextEncoder().encode(copy.text),
  }));
}

/** Official IRS TY2026 1040 ATS Scenario 4 packet (draft, 9/22/2026). */
export async function ty2026Scenario104004Input(): Promise<
  Record<string, unknown>
> {
  const { taxpayer, w2, form2441, form8863: school } = F;
  const nonrefundableEducation = Math.min(
    Math.round(F.adjustedQualifiedEducationExpenses * 0.6),
    TAX - DEPENDENT_CARE,
  );
  return {
    general: {
      ats_test_submission: true,
      taxpayer_first_name: taxpayer.firstName,
      taxpayer_last_name: taxpayer.lastName,
      taxpayer_ssn: taxpayer.ssn,
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
      taxpayer_dob: taxpayer.dateOfBirth,
      taxpayer_blind: taxpayer.blind,
      taxpayer_can_be_claimed_as_dependent: false,
      taxpayer_prior_year_agi: 0,
      address_line1: `${taxpayer.address.line1} ${taxpayer.address.line2}`,
      address_city: taxpayer.address.city,
      address_state: taxpayer.address.state,
      address_zip: taxpayer.address.zip,
      main_home_in_us_over_half_year: true,
      filing_status: FilingStatus.HOH,
      hoh_paid_more_than_half_home_costs: true,
      digital_assets: taxpayer.digitalAssets,
      presidential_campaign_fund_taxpayer: taxpayer.presidentialCampaignFund,
      child_eic_filer_review: {
        not_qualifying_child_of_another_taxpayer_verified: true,
        relationship_age_residence_record_reference:
          `${PACKET}-schedule-eic-page-16`,
      },
      prior_eic_disallowance_review: {
        status: "requires_8862",
        disallowed_year: 2024,
        disallowance_notice_reference: `${PACKET}-2024-eic-notice`,
        notice_copy_reference: NOTICES.eic.reference,
        notice_copy_sha256: await sha256(NOTICES.eic.text),
      },
      prior_aotc_disallowance_review: {
        disallowed_year: 2024,
        notice_reference: `${PACKET}-2024-aotc-notice`,
        notice_copy_reference: NOTICES.aotc.reference,
        notice_copy_sha256: await sha256(NOTICES.aotc.text),
        taxpayer_ssn: taxpayer.ssn,
        nonclerical_disallowance_verified: true,
        no_active_ban_verified: true,
      },
      prior_ctc_disallowance_review: {
        disallowed_year: 2024,
        notice_reference: `${PACKET}-2024-ctc-notice`,
        notice_copy_reference: NOTICES.ctc.reference,
        notice_copy_sha256: await sha256(NOTICES.ctc.text),
        taxpayer_ssn: taxpayer.ssn,
        nonclerical_disallowance_verified: true,
        no_active_ban_verified: true,
      },
      eic_tax_residency_review: {
        status: "all_year_resident",
        taxpayer_status_record_reference: `${PACKET}-form8862-page-11`,
      },
      dependents: dependents(),
    },
    w2: [{
      source_document_reference: `${PACKET}-w2-page-4`,
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
    form2441: {
      filing_details: {
        filing_status: FilingStatus.HOH,
        student_or_disabled_deemed_income_used: form2441.lineBDeemedIncome,
        care_providers: form2441.providers.map((p) => ({
          kind: "business" as const,
          name: p.name,
          ein: p.ein,
          name_control: p.name.replace(/[^A-Za-z]/g, "").slice(0, 4)
            .toUpperCase(),
          us_address: p.address,
          household_employee: p.householdEmployee,
          amount_paid: p.amountPaid,
        })),
        qualifying_people: [F.dependents[1], F.dependents[0]].map((d) => ({
          first_name: d.firstName,
          last_name: d.lastName,
          name_control: d.lastName.slice(0, 4).toUpperCase(),
          ssn: d.ssn,
          over_12_and_disabled: false,
          credit_expenses_paid: d.careExpenses,
        })),
        taxpayer_earned_income: w2.box1Wages,
        tax_liability_limit: TAX,
      },
    },
    f8812_credit_limit_worksheet: {
      credit_limit_worksheet: {
        schedule3_line1: 0,
        schedule3_line2: DEPENDENT_CARE,
        schedule3_line3: nonrefundableEducation,
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
    f8862: {
      claim_eitc: true,
      claim_ctc: true,
      claim_aotc: true,
      credit_disallowance_ban_active: false,
      eitc_disallowed_year: 2024,
      eitc_disallowance_notice_reference: `${PACKET}-2024-eic-notice`,
      aotc_disallowed_year: 2024,
      aotc_disallowance_notice_reference: `${PACKET}-2024-aotc-notice`,
      ctc_disallowed_year: 2024,
      ctc_disallowance_notice_reference: `${PACKET}-2024-ctc-notice`,
      eitc_income_reporting_only: false,
      eitc_qualifying_child_of_other: false,
      eitc_children: F.dependents.map((d) => ({
        first_name: d.firstName,
        last_name: d.lastName,
        days_in_us: F.form8862.daysInUs,
      })),
      ctc_children: F.dependents.map((d) => ({
        first_name: d.firstName,
        last_name: d.lastName,
        lived_with_over_half_year: true,
        qualifying_child: true,
        dependent: true,
        us_citizen_national_or_resident: true,
      })),
      aotc_students: [{
        first_name: taxpayer.firstName,
        last_name: taxpayer.lastName,
        eligible: F.form8862.studentEligible,
        credit_claimed_four_prior_years: F.form8862.priorFourYears,
      }],
    },
    f8863: [{
      credit_type: "aoc",
      student_name: `${taxpayer.firstName} ${taxpayer.lastName}`,
      student_ssn: taxpayer.ssn,
      filer_magi: AGI,
      filing_status: FilingStatus.HOH,
      aoc_adjusted_expenses: F.adjustedQualifiedEducationExpenses,
      aoc_claimed_4_prior_years: school.aotcClaimedFourPriorYears,
      enrolled_half_time: school.enrolledAtLeastHalfTime,
      completed_4_years_postsec: school.completedFirstFourYears,
      felony_drug_conviction: school.felonyDrugConviction,
      taxpayer_under_24_no_refundable_aoc: false,
      education_expense_workpaper: {
        missing_1098t_exception: {
          student_ssn: taxpayer.ssn,
          institution_name: school.institutionName,
          eligible_educational_institution: true,
          eligible_institution_record_id: `${PACKET}-form8863-page-15-line22`,
          student_enrolled: true,
          enrolled_in_degree_or_credential_program: true,
          enrollment_record_id: `${PACKET}-form8863-page-15-line24`,
          academic_period_start_date: "2026-01-12",
          payment_tax_year: 2026,
          assistance_record_id: `${PACKET}-cover-page-1-adjusted-expenses`,
          nonreceipt_basis_record_id: `${PACKET}-form8863-page-15-line22a2`,
          reason: "required_but_not_received",
          institution_required_to_furnish_1098t: true,
          requested_1098t_date: "2027-02-01",
          request_record_id: `${PACKET}-1098t-request`,
          fully_cooperated: true,
          cooperation_record_id: `${PACKET}-1098t-cooperation`,
          return_filing_date: "2027-02-02",
        },
        payment_record_ids: [`${PACKET}-tuition-payment`],
        paid_tuition_required_fees: F.adjustedQualifiedEducationExpenses,
        paid_course_materials_to_institution: 0,
        paid_course_materials_elsewhere: 0,
        outside_materials_needed_for_course: false,
        institution_materials_required_for_enrollment: false,
        tax_free_assistance_applied_to_expenses: 0,
        qualified_expense_refunds: 0,
        expenses_used_for_other_tax_benefits: 0,
      },
      filing_details: {
        first_name: taxpayer.firstName,
        last_name: taxpayer.lastName,
        name_control: taxpayer.lastName.slice(0, 4).toUpperCase(),
        institutions: [{
          name: school.institutionName,
          us_address: school.institutionAddress,
          current_year_1098t_received: school.received1098TFor2026,
          prior_year_1098t_received: school.received1098TFor2025Box7,
          ein: school.institutionEin,
        }],
      },
    }],
    f8863_credit_limit_worksheet: {
      credit_limit_worksheet: {
        form1040_line18_tax: TAX,
        schedule3_line1_foreign_tax_credit: 0,
        schedule3_line2_dependent_care_credit: DEPENDENT_CARE,
        schedule3_line6d: 0,
        schedule3_line6l: 0,
      },
    },
  };
}
