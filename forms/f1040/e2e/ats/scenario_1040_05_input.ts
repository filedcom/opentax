import {
  DependentRelationship,
  IRSDependentRelationshipCode,
} from "../../nodes/inputs/general/filing/general/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { SCENARIO_1040_05_FACTS } from "./ty2025_cases.ts";

export type AtsAssumption = {
  readonly field: string;
  readonly value: string | number | boolean;
  readonly why: string;
};

const PACKET = "irs-ty2025-ats-1040-05";

/** Packet amounts and hand-computed lines from the 2025 instructions. */
export const SCENARIO_1040_05_RECONCILIATION = {
  sourceUrl:
    "https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-5-10202025.pdf",
  sourceSha256:
    "2ecfd873224b8d1e0912caa68682f3b06a8887565205808e0ed8777cc408c779",
  identityPage: 2,
  w2Page: 4,
  form1040Line1aWages: 31_232,
  form1040Line25aWithholding: 1_754,
  schedule1Line14StorageFees: 1_475,
  form1040Line11Agi: 29_757,
  // HOH $23,625 plus $2,000 for blindness (2025 Form 1040 instructions).
  form1040Line12StandardDeduction: 25_625,
  form1040Line15TaxableIncome: 4_132,
  // 2025 Tax Table, $4,100-$4,150 row, head of household.
  form1040Line18Tax: 413,
  // Form 2441: $1,820 x 27% = $491, limited to the $413 tax.
  form2441Line9a: 491,
  schedule3Line2DependentCare: 413,
  // Form 8863: $980 AOC; 40% refundable, the nonrefundable part limited to $0.
  form8863Line8RefundableAoc: 392,
  schedule3Line3Education: 0,
  form1040Line19Ctc: 0,
  form1040Line28OptOut: true,
  form1040Line28Actc: 0,
  form1040Line24TotalTax: 0,
  packetConflicts: [
    'Form 2441 p.8 line 1 prints the first provider as "Kid Corner"; the cover sheet p.1 prints "Kid Korner". The cover-sheet spelling is used.',
    "Form 8862 p.10 lines 1 and 2 are blank although Parts II-IV are completed; the claims are recorded as an assumption.",
    "Form 8862 p.11 Part III answers CTC questions for both children, but the return's CTC is $0 (Schedule 8812 Credit Limit Worksheet A: $413 tax less the $413 Form 2441 credit) and the ACTC is opted out, so no CTC is claimed and Part III is not transmitted.",
    "Form 8862 p.10 line 6 (Schedule EIC shows a qualifying child) has neither box marked; Schedule EIC p.15 lists two children.",
  ],
} as const;

/** Facts a guard requires that the Scenario 5 packet does not print. */
export const SCENARIO_1040_05_ASSUMPTIONS: readonly AtsAssumption[] = [
  {
    field: "general.taxpayer_prior_year_agi",
    value: 0,
    why: "The packet gives no 2024 AGI; 0 is the header placeholder.",
  },
  {
    field: "f8862.claim_eitc / claim_aotc",
    value: true,
    why:
      "Form 8862 p.10 line 2 leaves every box blank, but Parts II and IV are completed and the return claims EIC and AOTC. CTC is not claimed: Credit Limit Worksheet A leaves $0 after the Form 2441 credit and ACTC is opted out, so Part III is not filed.",
  },
  {
    field: "f8862 disallowed years and notice references",
    value: 2023,
    why:
      "Form 8862 is filed only after a prior disallowance; the packet gives no year or notice, so a 2023 notice is recorded.",
  },
  {
    field: "general.prior_*_disallowance_review notice copy",
    value: `${PACKET}-2023-notice-copy`,
    why: "The packet implies a prior IRS notice without reproducing it.",
  },
  {
    field:
      "dependents[].ssn_valid_for_employment, citizenship, support, joint return",
    value: true,
    why:
      "The packet marks both children as CTC-qualifying (1040 p.2; Form 8862 Part III lines 14-17), which requires these facts.",
  },
  {
    field: "general.taxpayer_ssn_valid_for_employment",
    value: true,
    why: "EIC requires it; the packet's W-2 SSN is the taxpayer's.",
  },
  {
    field: "general HOH, EIC filer and residency reviews",
    value: "packet household",
    why:
      "HOH is checked with both children in the home 12 months and the lived-apart box marked; records are named for the packet pages.",
  },
  {
    field: "f3903[0].storage_fees_only",
    value: 1_475,
    why:
      "Schedule 1 p.6 line 14 marks the storage-fees-only box and the cover sheet gives $1,475; the Form 3903 instructions' conditions (Armed Forces member, earlier move, storage during absence from the U.S., government payment in W-2 box 1) are taken as met.",
  },
  {
    field: "f8863 missing 1098-T exception",
    value: "required_but_not_received",
    why:
      "Form 8863 p.14 line 22a(2)/(3) answer No to both 1098-T questions; the request and cooperation records are named for the packet.",
  },
  {
    field: "f8863 payment source",
    value: 980,
    why:
      "The cover sheet gives $980 adjusted qualified expenses with no breakdown; all of it is recorded as tuition.",
  },
];

function dependents() {
  return SCENARIO_1040_05_FACTS.dependents.map((child) => {
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
      dob: child.dateOfBirth,
      relationship: son
        ? DependentRelationship.Son
        : DependentRelationship.Daughter,
      months_in_home: child.monthsInHome,
      months_lived_with_you_in_us: child.monthsInHome,
      lived_in_us_over_half_year: true,
      us_citizen_national_or_resident: true,
      provided_over_half_own_support: false,
      filed_joint_return_except_refund_only: false,
      qualifying_child_for_ctc: child.childTaxCredit,
      dependent_on_another_return: false,
      child_care_months: 12,
    };
  });
}

const noticeCopy = (credit: "EIC" | "AOTC", sha256: string) => ({
  reference: `${PACKET}-2023-${credit.toLowerCase()}-notice-copy`,
  text:
    `Assumed retained copy of the 2023 IRS ${credit} disallowance notice for ATS Scenario 5 (SSN 400-00-1039); the packet does not reproduce it.\n`,
  sha256,
});
const NOTICE_COPIES = {
  eic: noticeCopy(
    "EIC",
    "bd598802a255b78b38389eaece0bada804192e0b4e7e02c2f30b1480a142d9b3",
  ),
  aotc: noticeCopy(
    "AOTC",
    "97ec78687f2475996cbbd3a1c9b974dc9d043d22aa748aa448b076c9016917ac",
  ),
} as const;

/** Retained, untransmitted notice copies the Form 8862 export verifies. */
export function scenario104005RetainedSourceDocuments() {
  return Object.values(NOTICE_COPIES).map((copy) => ({
    document_reference: copy.reference,
    bytes: new TextEncoder().encode(copy.text),
  }));
}

/** Complete Scenario 5 return from the packet, with recorded assumptions. */
export function scenario104005Input() {
  const { taxpayer, w2, form2441, form8863: student, dependents: kids } =
    SCENARIO_1040_05_FACTS;
  const tax = SCENARIO_1040_05_RECONCILIATION.form1040Line18Tax;
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
      address_line1: taxpayer.address.line1,
      address_city: taxpayer.address.city,
      address_state: taxpayer.address.state,
      address_zip: taxpayer.address.zip,
      main_home_in_us_over_half_year: true,
      filing_status: FilingStatus.HOH,
      hoh_paid_more_than_half_home_costs: true,
      hoh_spouse_lived_apart_review: {
        lived_apart_last_six_months_of_2025_verified: true,
        separate_residence_record_reference: `${PACKET}-form1040-page-2`,
      },
      digital_assets: taxpayer.digitalAssets,
      presidential_campaign_fund_taxpayer: taxpayer.presidentialCampaignFund,
      child_eic_filer_review: {
        not_qualifying_child_of_another_taxpayer_verified: true,
        relationship_age_residence_record_reference:
          `${PACKET}-schedule-eic-page-15`,
      },
      prior_eic_disallowance_review: {
        status: "requires_8862",
        disallowed_year: 2023,
        disallowance_notice_reference: `${PACKET}-2023-eic-notice`,
        notice_copy_reference: NOTICE_COPIES.eic.reference,
        notice_copy_sha256: NOTICE_COPIES.eic.sha256,
      },
      prior_aotc_disallowance_review: {
        disallowed_year: 2023,
        notice_reference: `${PACKET}-2023-aotc-notice`,
        notice_copy_reference: NOTICE_COPIES.aotc.reference,
        notice_copy_sha256: NOTICE_COPIES.aotc.sha256,
        taxpayer_ssn: SCENARIO_1040_05_FACTS.taxpayer.ssn,
        nonclerical_disallowance_verified: true,
        no_active_ban_verified: true,
      },
      eic_tax_residency_review: {
        status: "all_year_resident",
        taxpayer_status_record_reference: `${PACKET}-form8862-page-10`,
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
        care_providers: form2441.providers.map((p) => ({
          kind: "business" as const,
          name: p.name,
          ein: p.ein,
          name_control: p.name.replace(/[^A-Za-z]/g, "").slice(0, 4)
            .toUpperCase(),
          us_address: {
            line1: p.address.split(", ")[0],
            city: "Seattle",
            state: "WA",
            zip: "98104",
          },
          household_employee: p.householdEmployee,
          amount_paid: p.amountPaid,
        })),
        qualifying_people: kids.map((child) => ({
          first_name: child.firstName,
          last_name: child.lastName,
          name_control: child.lastName.slice(0, 4).toUpperCase(),
          ssn: child.ssn,
          over_12_and_disabled: false,
          credit_expenses_paid: child.careExpenses,
        })),
        taxpayer_earned_income: w2.box1Wages,
        tax_liability_limit: tax,
      },
    },
    f3903: [{
      transportation_storage: SCENARIO_1040_05_FACTS.schedule1.movingExpenses,
      active_duty_military: true,
      storage_fees_only: {
        moved_in_earlier_year_verified: true,
        storage_during_absence_from_us_verified: true,
        government_storage_payment_in_w2_box1_verified: true,
        storage_fee_record_reference: `${PACKET}-cover-page-1`,
      },
    }],
    f8812: [{
      qualifying_children_count: kids.length,
      other_dependents_count: 0,
      filing_status: FilingStatus.HOH,
      agi: SCENARIO_1040_05_RECONCILIATION.form1040Line11Agi,
      income_tax_liability: tax,
      do_not_claim_actc: SCENARIO_1040_05_FACTS.optOutOfAdditionalChildTaxCredit,
      bona_fide_pr_resident: SCENARIO_1040_05_FACTS.bonaFidePuertoRicoResident,
    }],
    f8812_credit_limit_worksheet: {
      credit_limit_worksheet: {
        schedule3_line1: 0,
        schedule3_line2: tax,
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
    f8862: {
      claim_eitc: true,
      claim_ctc: false,
      claim_aotc: true,
      credit_disallowance_ban_active: false,
      eitc_disallowed_year: 2023,
      eitc_disallowance_notice_reference: `${PACKET}-2023-eic-notice`,
      aotc_disallowed_year: 2023,
      aotc_disallowance_notice_reference: `${PACKET}-2023-aotc-notice`,
      eitc_income_reporting_only: false,
      eitc_qualifying_child_of_other: false,
      eitc_children: kids.map((child) => ({
        first_name: child.firstName,
        last_name: child.lastName,
        days_in_us: 365,
      })),
      aotc_students: [{
        first_name: taxpayer.firstName,
        last_name: taxpayer.lastName,
        eligible: SCENARIO_1040_05_FACTS.form8862.studentEligibleForAotc,
        credit_claimed_four_prior_years: false,
      }],
    },
    f8863: [{
      credit_type: "aoc",
      student_name: student.studentName,
      student_ssn: taxpayer.ssn,
      filer_magi: SCENARIO_1040_05_RECONCILIATION.form1040Line11Agi,
      filing_status: FilingStatus.HOH,
      aoc_adjusted_expenses: student.adjustedQualifiedEducationExpenses,
      aoc_claimed_4_prior_years: false,
      enrolled_half_time: student.enrolledAtLeastHalfTime,
      completed_4_years_postsec: student.completedFirstFourYearsBefore2025,
      felony_drug_conviction: student.felonyDrugConviction,
      taxpayer_under_24_no_refundable_aoc: false,
      education_expense_workpaper: {
        missing_1098t_exception: {
          student_ssn: taxpayer.ssn,
          institution_name: student.institutionName,
          eligible_educational_institution: true,
          eligible_institution_record_id: `${PACKET}-form8863-page-14-line22`,
          student_enrolled: true,
          enrolled_in_degree_or_credential_program: true,
          enrollment_record_id: `${PACKET}-form8863-page-14-line24`,
          academic_period_start_date: "2025-01-13",
          payment_tax_year: 2025,
          assistance_record_id: `${PACKET}-cover-page-1-adjusted-expenses`,
          nonreceipt_basis_record_id: `${PACKET}-form8863-page-14-line22a2`,
          reason: "required_but_not_received",
          institution_required_to_furnish_1098t: true,
          requested_1098t_date: "2026-02-02",
          request_record_id: `${PACKET}-1098t-request`,
          fully_cooperated: true,
          cooperation_record_id: `${PACKET}-1098t-cooperation`,
          return_filing_date: "2026-04-01",
        },
        payment_record_ids: [`${PACKET}-tuition-payment`],
        paid_tuition_required_fees: student.adjustedQualifiedEducationExpenses,
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
          name: student.institutionName,
          us_address: {
            line1: "1234 Blue Street",
            city: "Austin",
            state: "TX",
            zip: "78701",
          },
          current_year_1098t_received: student.received1098TFor2025,
          prior_year_1098t_received: student.received1098TFor2024,
          ein: student.institutionEin,
        }],
      },
    }],
    f8863_credit_limit_worksheet: {
      credit_limit_worksheet: {
        form1040_line18_tax: tax,
        schedule3_line1_foreign_tax_credit: 0,
        schedule3_line2_dependent_care_credit: tax,
        schedule3_line6d: 0,
        schedule3_line6l: 0,
      },
    },
  };
}
