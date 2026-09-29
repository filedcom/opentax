import { assert, assertEquals, assertThrows } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import { calculateForm8863Lines, type F8863Input } from "../../../nodes/inputs/f8863/index.ts";
import { form8863 } from "./f8863.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
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

const worksheet = {
  form1040_line18_tax: 10_000,
  schedule3_line1_foreign_tax_credit: 0,
  schedule3_line2_dependent_care_credit: 0,
  schedule3_line6d: 0,
  schedule3_line6l: 0,
};

const educationWorkpaper = {
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
  education_expense_workpaper: educationWorkpaper,
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

function finalizedContext(fields: F8863Input) {
  const lines = calculateForm8863Lines(fields);
  if (!lines || !fields.credit_limit_worksheet) {
    throw new Error("Form 8863 test needs calculated credit and worksheet");
  }
  return {
    filer,
    pending: {
      f1040: {
        filing_status: "single",
        line11_agi: lines.line3,
        line18_total_tax_before_credits: fields.credit_limit_worksheet.form1040_line18_tax,
        line29_refundable_aoc: lines.line8,
      },
      schedule3: { line3_education_credit: lines.line19 },
    },
  };
}

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

Deno.test("Form 8863 XML uses capped line 19 and real student detail", () => {
  const fields = {
    f8863s: [aocStudent],
    credit_limit_worksheet: { ...worksheet, form1040_line18_tax: 400 },
  };
  const xml = form8863.build(fields, finalizedContext(fields));
  assert(
    xml.includes(
      "<RefundableAmerOppCreditAmt>1000</RefundableAmerOppCreditAmt>",
    ),
  );
  assert(
    xml.includes(
      "<NonrefundableEducationCrAmt>400</NonrefundableEducationCrAmt>",
    ),
  );
  assert(xml.includes("<StudentSSN>222334444</StudentSSN>"));
  assert(xml.includes("<EIN>123456789</EIN>"));
});

Deno.test("Form 8863 native filing requires the finalized return credit lines", () => {
  const fields = { f8863s: [aocStudent], credit_limit_worksheet: worksheet };
  assertThrows(
    () => form8863.build(fields),
    Error,
    "finalized Form 1040/Schedule 3",
  );
  const context = finalizedContext(fields);
  assertThrows(
    () => form8863.build(fields, {
      ...context,
      pending: {
        ...context.pending,
        schedule3: { line3_education_credit: 1_499 },
      },
    }),
    Error,
    "finalized Form 1040/Schedule 3",
  );
});

Deno.test("Form 8863 XML rejects missing structured filing facts", () => {
  assertThrows(
    () =>
      form8863.build({
        f8863s: [{ ...aocStudent, filing_details: undefined }],
        credit_limit_worksheet: worksheet,
      }),
    Error,
    "education expense workpaper",
  );
  assertThrows(
    () =>
      form8863.build({
        f8863s: [{ ...aocStudent, aoc_claimed_4_prior_years: undefined }],
        credit_limit_worksheet: worksheet,
      }),
    Error,
    "four-prior-years answer",
  );
  assertThrows(
    () =>
      form8863.build({
        f8863s: [{
          ...aocStudent,
          filing_details: {
            ...aocStudent.filing_details,
            institutions: [{
              ...aocStudent.filing_details.institutions[0],
              ein: undefined,
            }],
          },
        }],
        credit_limit_worksheet: worksheet,
      }),
    Error,
    "needs its EIN",
  );
});

Deno.test("Form 8863 filing reconciles paid expenses, scholarships, and 1098-T receipt", () => {
  const sourced = {
    ...aocStudent,
    aoc_adjusted_expenses: 4_000,
    education_expense_workpaper: {
      ...educationWorkpaper,
      form1098t_box1_payments: 4_500,
      form1098t_box5_scholarships: 500,
      paid_tuition_required_fees: 4_500,
      tax_free_assistance_applied_to_expenses: 500,
    },
  };
  const fields = { f8863s: [sourced], credit_limit_worksheet: worksheet };
  assert(form8863.build(fields, finalizedContext(fields))
    .includes("<AmerOppQualifiedExpensesAmt>4000</AmerOppQualifiedExpensesAmt>"));
  assertThrows(
    () => form8863.build({
      f8863s: [{ ...sourced, aoc_adjusted_expenses: 4_500 }],
      credit_limit_worksheet: worksheet,
    }),
    Error,
    "do not reconcile to the education expense workpaper",
  );
  assertThrows(
    () => form8863.build({
      f8863s: [{
        ...sourced,
        education_expense_workpaper: {
          ...sourced.education_expense_workpaper,
          tax_free_assistance_applied_to_expenses: 0,
        },
      }],
      credit_limit_worksheet: worksheet,
    }),
    Error,
    "all Form 1098-T box 5 scholarships",
  );
  assertThrows(
    () => form8863.build({
      f8863s: [{
        ...sourced,
        filing_details: {
          ...sourced.filing_details,
          institutions: [{
            ...sourced.filing_details.institutions[0],
            current_year_1098t_received: false,
          }],
        },
      }],
      credit_limit_worksheet: worksheet,
    }),
    Error,
    "received 2025 Form 1098-T",
  );
});

Deno.test("Form 8863 XML rejects duplicate student across AOC and LLC", () => {
  assertThrows(
    () =>
      form8863.build({
        f8863s: [
          aocStudent,
          {
            ...aocStudent,
            credit_type: "llc",
            student_ssn: "222334444",
            aoc_adjusted_expenses: undefined,
            llc_adjusted_expenses: 2_000,
          },
        ],
        credit_limit_worksheet: worksheet,
      }),
    Error,
    "same student SSN twice",
  );
});

Deno.test("Form 8863 LLC rejects course materials bought outside the institution", () => {
  assertThrows(
    () => form8863.build({
      f8863s: [{
        ...aocStudent,
        credit_type: "llc",
        aoc_adjusted_expenses: undefined,
        llc_adjusted_expenses: 4_000,
        education_expense_workpaper: {
          ...educationWorkpaper,
          paid_tuition_required_fees: 3_500,
          paid_course_materials_elsewhere: 500,
        },
      }],
      credit_limit_worksheet: worksheet,
    }),
    Error,
    "outside-institution course materials",
  );
});

Deno.test({
  name: "XSD: Form 8863 AOC and LLC validate in TY2025 return",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f8863: {
      f8863s: [
        aocStudent,
        {
          ...aocStudent,
          credit_type: "llc",
          student_name: "Scholar Test",
          student_ssn: "333-44-5555",
          aoc_adjusted_expenses: undefined,
          llc_adjusted_expenses: 5_000,
          education_expense_workpaper: {
            ...educationWorkpaper,
            form1098t_document_id: "1098T-2025-SCHOLAR",
            payment_record_ids: ["TUITION-2025-SCHOLAR"],
            form1098t_box1_payments: 5_000,
            paid_tuition_required_fees: 5_000,
          },
          filing_details: {
            ...aocStudent.filing_details,
            first_name: "Scholar",
          },
        },
      ],
      credit_limit_worksheet: worksheet,
    },
    f1040: {
      filing_status: "single",
      line11_agi: 70_000,
      line18_total_tax_before_credits: 10_000,
      line29_refundable_aoc: 1_000,
    },
    schedule3: { line3_education_credit: 2_500 },
  }, filer);
  await validateXsd(xml);
});
