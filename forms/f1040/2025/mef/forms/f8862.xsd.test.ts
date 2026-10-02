import { assertEquals, assertThrows } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { buildPending } from "../pending.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The IRS schema bundle is local-only.
}

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

const priorEicEvidence = {
  eitc_disallowed_year: 2023,
  eitc_disallowance_notice_reference: "Synthetic 2023 IRS notice",
};
const generalEicSource = {
  filing_status: "single",
  digital_assets: false,
  child_eic_filer_review: {
    not_qualifying_child_of_another_taxpayer_verified: true,
    relationship_age_residence_record_reference:
      "Synthetic 2025 filer family and residence review",
  },
  taxpayer_ssn: "123456789",
  prior_ctc_disallowance_review: {
    disallowed_year: 2023,
    notice_reference: "Synthetic 2023 IRS CTC notice",
    notice_copy_reference: "Retained synthetic CTC notice copy",
    taxpayer_ssn: "123456789",
    nonclerical_disallowance_verified: true,
    no_active_ban_verified: true,
  },
  prior_aotc_disallowance_review: {
    disallowed_year: 2023,
    notice_reference: "Synthetic 2023 IRS AOTC notice",
    notice_copy_reference: "Retained synthetic AOTC notice copy",
    taxpayer_ssn: "123456789",
    nonclerical_disallowance_verified: true,
    no_active_ban_verified: true,
  },
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
  taxpayer_dob: "1985-06-15",
  prior_eic_disallowance_review: {
    status: "requires_8862",
    disallowed_year: 2023,
    disallowance_notice_reference: "Synthetic 2023 IRS notice",
  },
  eic_tax_residency_review: {
    status: "all_year_resident",
    taxpayer_status_record_reference: "Synthetic 2025 resident status review",
  },
};
const childlessEicSource = {
  ...generalEicSource,
  main_home_in_us_over_half_year: true,
  taxpayer_can_be_claimed_as_dependent: false,
  childless_eic_review: {
    not_qualifying_child_of_another_taxpayer_verified: true,
    qualifying_child_status_record_reference: "Synthetic 2025 family review",
  },
};
const claimedChild = {
  first_name: "Child",
  last_name: "Test",
  name_control: "TEST",
  ssn: "111223334",
  ssn_valid_for_employment: true,
  ssn_issued_before_due_date: true,
  tin_issued_by_due_date: true,
  dob: "2017-07-04",
  relationship: "daughter",
  irs_relationship_code: "DAUGHTER",
  months_in_home: 12,
  months_lived_with_you_in_us: 12,
  lived_in_us_over_half_year: true,
  us_citizen_national_or_resident: true,
  provided_over_half_own_support: false,
  filed_joint_return_except_refund_only: false,
};

const aocStudent = {
  credit_type: "aoc" as const,
  student_name: "Student Test",
  student_ssn: "222-33-4444",
  filer_magi: 70_000,
  filing_status: NodeFilingStatus.Single,
  aoc_adjusted_expenses: 4_000,
  aoc_claimed_4_prior_years: false,
  enrolled_half_time: true,
  completed_4_years_postsec: false,
  felony_drug_conviction: false,
  taxpayer_under_24_no_refundable_aoc: false,
  education_expense_workpaper: {
    form1098t_box1_payments: 4_000,
    form1098t_box5_scholarships: 0,
    form1098t_document_id: "1098T-2025-STUDENT",
    payment_record_ids: ["TUITION-2025-STUDENT"],
    paid_tuition_required_fees: 4_000,
    paid_course_materials_to_institution: 0,
    paid_course_materials_elsewhere: 0,
    outside_materials_needed_for_course: false,
    institution_materials_required_for_enrollment: false,
    tax_free_assistance_applied_to_expenses: 0,
    qualified_expense_refunds: 0,
    expenses_used_for_other_tax_benefits: 0,
  },
  filing_details: {
    first_name: "Student",
    last_name: "Test",
    name_control: "TEST",
    institutions: [{
      name: "Test University",
      us_address: {
        line1: "1 College Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      current_year_1098t_received: true,
      prior_year_1098t_received: false,
      ein: "12-3456789",
    }],
  },
};

async function validateXsd(xml: string): Promise<void> {
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, xml);
    const output = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));
  } finally {
    await Deno.remove(tmpPath);
  }
}

Deno.test({
  name: "XSD fixture: CTC and AOTC notice assertions cannot authorize filing",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, () => {
  assertThrows(
    () =>
      buildMefXml(
        buildPending({
          f8862: {
            credit_disallowance_ban_active: false,
            claim_eitc: true,
            ...priorEicEvidence,
            claim_ctc: true,
            ctc_disallowed_year: 2023,
            ctc_disallowance_notice_reference: "Synthetic 2023 IRS CTC notice",
            claim_aotc: true,
            aotc_disallowed_year: 2023,
            aotc_disallowance_notice_reference:
              "Synthetic 2023 IRS AOTC notice",
            eitc_income_reporting_only: false,
            eitc_qualifying_child_of_other: false,
            eitc_children: [{
              first_name: "Child",
              last_name: "Test",
              days_in_us: 365,
              birth_month_day: "--07-04",
            }],
            ctc_children: [{
              first_name: "Child",
              last_name: "Test",
              lived_with_over_half_year: true,
              qualifying_child: true,
              dependent: true,
              us_citizen_national_or_resident: true,
            }],
            aotc_students: [{
              first_name: "Student",
              last_name: "Test",
              eligible: true,
              credit_claimed_four_prior_years: false,
            }],
          },
          f8863: {
            f8863s: [aocStudent],
            credit_limit_worksheet: {
              form1040_line18_tax: 10_000,
              schedule3_line1_foreign_tax_credit: 0,
              schedule3_line2_dependent_care_credit: 0,
              schedule3_line6d: 0,
              schedule3_line6l: 0,
            },
          },
          f1040: {
            filing_status: "single",
            digital_assets: false,
            eic_tax_residency_review: generalEicSource.eic_tax_residency_review,
            taxpayer_ssn: "123456789",
            taxpayer_ssn_valid_for_employment: true,
            taxpayer_ssn_issued_before_due_date: true,
            taxpayer_tin_issued_by_due_date: true,
            dependent_count: 1,
            qualifying_child_tax_credit_count: 1,
            dependent_details: [{ ...claimedChild, credit_category: "ctc" }],
            line11_agi: 70_000,
            line18_total_tax_before_credits: 10_000,
            line19_child_tax_credit: 2_200,
            line27_eitc: 500,
            line29_refundable_aoc: 1_000,
          },
          general: { ...generalEicSource, dependents: [claimedChild] },
          eitc: {
            credit_amount: 500,
            investment_income_floor: 0,
            qualifying_children: 1,
            qualifying_child_details: [{
              first_name: "Child",
              last_name: "Test",
              name_control: "TEST",
              ssn: "111223334",
              ssn_valid_for_employment: true,
              tin_issued_by_due_date: true,
              dob: "2017-07-04",
              irs_relationship_code: "DAUGHTER",
              months_in_home: 12,
            }],
          },
          schedule3: { line3_education_credit: 1_500 },
        }),
        filer,
      ),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
});

Deno.test("Form 8862 childless EITC return remains blocked before XSD", () => {
  assertThrows(
    () =>
      buildMefXml(
        buildPending({
          f8862: {
            credit_disallowance_ban_active: false,
            claim_eitc: true,
            ...priorEicEvidence,
            eitc_income_reporting_only: false,
            eitc_qualifying_child_of_other: false,
            eitc_without_child: {
              primary: {
                main_home_us_days: 365,
                age: 35,
                claimed_as_dependent: false,
              },
            },
          },
          f1040: {
            taxpayer_ssn: "123456789",
            filing_status: "single",
            digital_assets: false,
            eic_tax_residency_review:
              childlessEicSource.eic_tax_residency_review,
            main_home_in_us_over_half_year: true,
            line27_eitc: 500,
          },
          general: childlessEicSource,
          eitc: {
            credit_amount: 500,
            qualifying_children: 0,
            investment_income_floor: 0,
          },
        }),
        filer,
      ),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
});

Deno.test("Form 8862 income-only EITC return remains blocked before XSD", () => {
  assertThrows(
    () =>
      buildMefXml(
        buildPending({
          f8862: {
            credit_disallowance_ban_active: false,
            claim_eitc: true,
            ...priorEicEvidence,
            eitc_income_reporting_only: true,
          },
          f1040: {
            taxpayer_ssn: "123456789",
            filing_status: "single",
            digital_assets: false,
            eic_tax_residency_review:
              childlessEicSource.eic_tax_residency_review,
            main_home_in_us_over_half_year: true,
            line27_eitc: 500,
          },
          general: childlessEicSource,
          eitc: {
            credit_amount: 500,
            qualifying_children: 0,
            investment_income_floor: 0,
          },
        }),
        filer,
      ),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
});
