import { assertEquals } from "@std/assert";
import { buildMefXml } from "../builder.ts";
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
  name: "XSD: Form 8862 EITC, CTC and AOTC document validates in TY2025 return",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f8862: {
      credit_disallowance_ban_active: false,
      claim_eitc: true,
      claim_ctc: true,
      claim_aotc: true,
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
      line11_agi: 70_000,
      line18_total_tax_before_credits: 10_000,
      line19_child_tax_credit: 2_200,
      line27_eitc: 500,
      line29_refundable_aoc: 1_000,
    },
    schedule3: { line3_education_credit: 1_500 },
  }, filer);
  await validateXsd(xml);
});

Deno.test({
  name: "XSD: Form 8862 childless EITC validates with a claimed return credit",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  // This fixture checks XML shape and cross-document presence, not EITC math.
  const xml = buildMefXml({
    f8862: {
      credit_disallowance_ban_active: false,
      claim_eitc: true,
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
    f1040: { filing_status: "single", line27_eitc: 500 },
  }, filer);
  assertEquals(xml.includes("<PrimaryNoQualifyingChildGrp>"), true);
  await validateXsd(xml);
});

Deno.test({
  name: "XSD: Form 8862 income-only EITC omits the rest of Part II",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f8862: {
      credit_disallowance_ban_active: false,
      claim_eitc: true,
      eitc_income_reporting_only: true,
    },
    f1040: { filing_status: "single", line27_eitc: 500 },
  }, filer);
  assertEquals(xml.includes("EICEligClmQlfyChldOfOtherInd"), false);
  await validateXsd(xml);
});
