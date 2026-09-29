import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import { FilingStatus as SourceFilingStatus } from "../../../nodes/types.ts";
import { form8863Pdf } from "./f8863.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};
const student = {
  credit_type: "aoc" as const,
  student_name: "Student Test",
  student_ssn: "222-33-4444",
  filer_magi: 70_000,
  filing_status: SourceFilingStatus.Single,
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
const worksheet = {
  form1040_line18_tax: 10_000,
  schedule3_line1_foreign_tax_credit: 0,
  schedule3_line2_dependent_care_credit: 0,
  schedule3_line6d: 0,
  schedule3_line6l: 0,
};
const source = { f8863s: [student], credit_limit_worksheet: worksheet };
const final = {
  f1040: {
    filing_status: "single",
    line11_agi: 70_000,
    line18_total_tax_before_credits: 10_000,
    line29_refundable_aoc: 1_000,
  },
  schedule3: { line3_education_credit: 1_500 },
};

Deno.test("Form 8863 PDF maps the canonical page-one totals and one sourced Part III", () => {
  const instances = form8863Pdf.instances?.(source, filer, final) ?? [];
  assertEquals(instances.length, 1);
  assertEquals(form8863Pdf.pageIndices?.(instances[0]), [0, 1]);
  assertEquals(instances[0].line8, 1_000);
  assertEquals(instances[0].line19, 1_500);
  assertEquals(instances[0].pdf_student_name, "Student Test");
  assertEquals(instances[0].pdf_student_ssn_a, "222");
  assertEquals(instances[0].pdf_student_ssn_b, "33");
  assertEquals(instances[0].pdf_student_ssn_c, "4444");
  assertEquals(instances[0].pdf_institution_0_ein_0, "1");
  assertEquals(instances[0].pdf_institution_0_ein_8, "9");
  assertEquals(instances[0].pdf_gate_23, "no");
  assertEquals(instances[0].pdf_gate_24, "yes");
  assertEquals(instances[0].pdf_line30, 2_500);
  assertEquals(form8863Pdf.filerFields?.map((field) => field.domainKey), [
    "nameLine1",
    "nameLine1",
  ]);
  assertEquals(
    form8863Pdf.fields.some((field) =>
      field.pdfField === "topmostSubform[0].Page2[0].f2-5[0]"
    ),
    true,
  );
});

Deno.test("Form 8863 PDF adds only a Part III page for a second student", () => {
  const llc = {
    ...student,
    credit_type: "llc" as const,
    student_name: "Scholar Test",
    student_ssn: "333-44-5555",
    aoc_adjusted_expenses: undefined,
    llc_adjusted_expenses: 5_000,
    education_expense_workpaper: {
      ...student.education_expense_workpaper,
      form1098t_document_id: "1098T-2025-SCHOLAR",
      payment_record_ids: ["TUITION-2025-SCHOLAR"],
      form1098t_box1_payments: 5_000,
      paid_tuition_required_fees: 5_000,
    },
    filing_details: { ...student.filing_details, first_name: "Scholar" },
  };
  const instances = form8863Pdf.instances?.(
    {
      f8863s: [student, llc],
      credit_limit_worksheet: worksheet,
    },
    filer,
    {
      ...final,
      schedule3: { line3_education_credit: 2_500 },
    },
  ) ?? [];
  assertEquals(instances.length, 2);
  assertEquals(form8863Pdf.pageIndices?.(instances[0]), [0, 1]);
  assertEquals(form8863Pdf.pageIndices?.(instances[1]), [1]);
  assertEquals(instances[1].pdf_line31, 5_000);
  assertEquals(instances[1].line19, undefined);
});

Deno.test("Form 8863 PDF closes ambiguous institution and unreconciled return paths", () => {
  assertThrows(
    () => form8863Pdf.instances?.(source, filer, {}),
    Error,
    "finalized Form 1040/Schedule 3",
  );
  assertThrows(
    () =>
      form8863Pdf.instances?.(source, filer, {
        ...final,
        schedule3: { line3_education_credit: 1_499 },
      }),
    Error,
    "finalized Form 1040/Schedule 3",
  );
  assertThrows(
    () =>
      form8863Pdf.instances?.(
        {
          ...source,
          f8863s: [{
            ...student,
            filing_details: {
              ...student.filing_details,
              institutions: [{
                ...student.filing_details.institutions[0],
                prior_year_1098t_received: true,
              }],
            },
          }],
        },
        filer,
        final,
      ),
    Error,
    "unambiguous prior-year box 7 answer",
  );
  assertThrows(
    () =>
      form8863Pdf.instances?.(
        {
          ...source,
          f8863s: [{
            ...student,
            filing_details: {
              ...student.filing_details,
              institutions: [{
                ...student.filing_details.institutions[0],
                us_address: undefined,
                foreign_address: {
                  line1: "1 College Road",
                  country_code: "CA",
                },
              }],
            },
          }],
        },
        filer,
        final,
      ),
    Error,
    "needs one U.S. institution, received 2025 Form 1098-T",
  );
});
