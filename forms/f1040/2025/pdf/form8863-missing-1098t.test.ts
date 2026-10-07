import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  type F8863Item,
  inputSchema,
  itemSchema,
  validateForm8863FilingSource,
} from "../../nodes/inputs/f8863/index.ts";
import { registry } from "../registry.ts";
import { f1040_2025 } from "../index.ts";
import { form8863 as native } from "../mef/forms/f8863.ts";
import { buildPending } from "../mef/pending.ts";
import { form8863Pdf } from "./forms/f8863.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;
const incomeSourceReference = "2025-Alex-issued-W2-employer-tuition";
const reviewedInputs = {
  ...base.inputs,
  w2: (base.inputs.w2 as Record<string, unknown>[]).map((source) => ({
    ...source,
    source_document_reference: incomeSourceReference,
  })),
};
const common = {
  student_ssn: base.filer.primarySSN,
  institution_name: "Test University",
  eligible_educational_institution: true,
  eligible_institution_record_id: "2025-school-Title-IV-eligibility-review",
  student_enrolled: true,
  enrolled_in_degree_or_credential_program: true,
  enrollment_record_id: "2025-Alex-school-enrollment",
  academic_period_start_date: "2025-09-01",
  payment_tax_year: 2025,
  assistance_record_id: "2025-Alex-school-financial-aid-review",
  nonreceipt_basis_record_id: "2025-Alex-school-nonreceipt-review",
};
const required = {
  ...common,
  reason: "required_but_not_received",
  institution_required_to_furnish_1098t: true,
  requested_1098t_date: "2026-02-02",
  request_record_id: "2026-Feb-02-Alex-request-to-school",
  fully_cooperated: true,
  cooperation_record_id: "2026-Alex-school-information-response",
  return_filing_date: "2026-04-01",
};
const exempt = {
  ...common,
  reason: "institution_not_required",
  institution_required_to_furnish_1098t: false,
  furnishing_basis: {
    kind: "formal_billing_arrangement",
    separate_student_financial_account: false,
    billing_counterparty: "employer",
    qualified_tuition_covered_by_formal_billing: true,
    billing_arrangement_record_id: "2025-employer-school-formal-billing",
    covered_qualified_tuition_payment_amount: 4_000,
    covered_payment_record_ids: ["2025-Alex-tuition-payment"],
    taxable_payment_amount: 4_000,
    tax_free_section127_payment_amount: 0,
    other_tax_free_payment_amount: 0,
    payment_tax_treatment_record_id:
      "2025-employer-education-payroll-tax-treatment",
    taxable_amount_in_student_gross_income: 4_000,
    student_gross_income_record_id: incomeSourceReference,
  },
};
function student(
  credit: "aoc" | "llc",
  exception: unknown = required,
): F8863Item {
  return itemSchema.parse({
    credit_type: credit,
    student_name: "Alex Example",
    student_ssn: base.filer.primarySSN,
    filer_magi: 75_000,
    filing_status: FilingStatus.Single,
    ...(credit === "aoc"
      ? { aoc_adjusted_expenses: 4_000 }
      : { llc_adjusted_expenses: 7_500 }),
    aoc_claimed_4_prior_years: false,
    enrolled_half_time: true,
    completed_4_years_postsec: false,
    felony_drug_conviction: false,
    taxpayer_under_24_no_refundable_aoc: false,
    education_expense_workpaper: {
      missing_1098t_exception: exception,
      payment_record_ids: ["2025-Alex-tuition-payment"],
      paid_tuition_required_fees: credit === "aoc" ? 4_000 : 8_000,
      paid_course_materials_to_institution: 0,
      paid_course_materials_elsewhere: 0,
      outside_materials_needed_for_course: false,
      institution_materials_required_for_enrollment: false,
      tax_free_assistance_applied_to_expenses: credit === "aoc" ? 0 : 500,
      qualified_expense_refunds: 0,
      expenses_used_for_other_tax_benefits: 0,
    },
    filing_details: {
      first_name: "Alex",
      last_name: "Example",
      name_control: "EXAM",
      institutions: [{
        name: "Test University",
        us_address: {
          line1: "1 College Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        current_year_1098t_received: false,
        prior_year_1098t_received: false,
        ein: credit === "aoc" ? "12-3456789" : undefined,
      }],
    },
  });
}
function returnCase(item: F8863Item) {
  const exception = item.education_expense_workpaper?.missing_1098t_exception;
  const basis = exception?.reason === "institution_not_required"
    ? exception.furnishing_basis
    : undefined;
  const result = execute(buildExecutionPlan(registry), registry, {
    ...reviewedInputs,
    ...(basis?.kind === "formal_billing_arrangement" &&
        basis.taxable_payment_amount
      ? {
        education_income: [{
          kind: "w2_education_payment",
          student_ssn: base.filer.primarySSN,
          source_document_reference: incomeSourceReference,
          tax_year: 2025,
          taxable_amount: basis.taxable_payment_amount,
          employer_ein: "12-3456789",
          w2_box1_wages: 75_000,
          payroll_allocation_record_id: basis.payment_tax_treatment_record_id,
        }],
      }
      : {}),
    f8863: [item],
    f8863_credit_limit_worksheet: {
      credit_limit_worksheet: {
        form1040_line18_tax: 7_955,
        schedule3_line1_foreign_tax_credit: 0,
        schedule3_line2_dependent_care_credit: 0,
        schedule3_line6d: 0,
        schedule3_line6l: 0,
      },
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  return buildPending(result.pending);
}
const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
let xsdAvailable = false;
try {
  Deno.statSync(xsd);
  xsdAvailable = true;
} catch { /* Local IRS bundle. */ }
async function validateXml(xml: string) {
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
}

for (const credit of ["aoc", "llc"] as const) {
  for (const reason of ["required", "exempt"] as const) {
    Deno.test(`missing 1098-T ${reason} ${credit} sources calculate and file with truthful No indicators`, async () => {
      const item = student(
        credit,
        reason === "required" ? required : credit === "aoc" ? exempt : {
          ...exempt,
          furnishing_basis: {
            ...exempt.furnishing_basis,
            covered_qualified_tuition_payment_amount: 8_000,
            taxable_payment_amount: 7_500,
            tax_free_section127_payment_amount: 500,
            section127_exclusion_record_id:
              "2025-employer-qualified-127-program-500-benefit",
            taxable_amount_in_student_gross_income: 7_500,
            student_gross_income_record_id: incomeSourceReference,
          },
        },
      );
      const pending = returnCase(item);
      assertEquals(pending.f1040!.line18_total_tax_before_credits, 7_955);
      assertEquals(pending.schedule3!.line3_education_credit, 1_500);
      assertEquals(
        pending.f1040!.line29_refundable_aoc ?? 0,
        credit === "aoc" ? 1_000 : 0,
      );
      assertEquals(pending.f1040!.line24_total_tax, 6_455);
      const xml = native.build(pending.f8863!, { pending, filer: base.filer });
      assertStringIncludes(
        xml,
        "<CurrentYear1098TReceivedInd>false</CurrentYear1098TReceivedInd>",
      );
      assertStringIncludes(
        xml,
        "<PriorYear1098TReceivedInd>false</PriorYear1098TReceivedInd>",
      );
      if (credit === "aoc") assertStringIncludes(xml, "<EIN>123456789</EIN>");
      else assertEquals(xml.includes("<EIN>"), false);
      assertStringIncludes(
        xml,
        "<NonrefundableEducationCrAmt>1500</NonrefundableEducationCrAmt>",
      );
      const [projected] = form8863Pdf.instances!(
        pending.f8863!,
        base.filer,
        pending as Record<string, Record<string, unknown>>,
      );
      assertEquals(projected.pdf_institution_0_current_1098t, "no");
      assertEquals(projected.pdf_institution_0_prior_box7, "no");
      assertEquals(projected.line19, 1_500);
      assertEquals(projected.line8 ?? 0, credit === "aoc" ? 1_000 : 0);
      assertEquals(
        projected[credit === "aoc" ? "pdf_line27" : "pdf_line31"],
        credit === "aoc" ? 4_000 : 7_500,
      );
      const prepared = await f1040_2025.prepareReturn(pending, base.filer);
      if (xsdAvailable) await validateXml(prepared.bundle.xml);
      const pdf = await prepared.renderPdf();
      const doc = await PDFDocument.load(pdf);
      assertEquals(doc.getPageCount(), 5);
      assertEquals(doc.getForm().getFields().length, 0);
      const path = await Deno.makeTempFile({ suffix: ".pdf" });
      try {
        await Deno.writeFile(path, pdf);
        const result = await new Deno.Command("pdftotext", {
          args: ["-layout", path, "-"],
          stdout: "piped",
          stderr: "piped",
        }).output();
        assertEquals(result.code, 0);
        const text = new TextDecoder().decode(result.stdout);
        assertStringIncludes(text, "Test University");
        assertEquals(/19\s+1500/.test(text), true);
        assertEquals(/24\s+6455/.test(text), true);
        if (credit === "aoc") assertEquals(/29\s+1000/.test(text), true);
      } finally {
        await Deno.remove(path);
      }
      const evidencePermission = await Deno.permissions.query({
        name: "env",
        variable: "FORM8863_EVIDENCE_DIR",
      });
      const dir = evidencePermission.state === "granted"
        ? Deno.env.get("FORM8863_EVIDENCE_DIR")
        : undefined;
      if (dir) {
        await Deno.mkdir(dir, { recursive: true });
        await Deno.writeTextFile(
          `${dir}/${reason}-${credit}-source-input.json`,
          JSON.stringify(
            {
              inputs: {
                ...reviewedInputs,
                education_income: pending.education_income?.education_incomes,
                f8863: [item],
                f8863_credit_limit_worksheet: {
                  credit_limit_worksheet: pending.f8863!.credit_limit_worksheet,
                },
              },
              filer: base.filer,
            },
            null,
            2,
          ),
        );
        await Deno.writeFile(
          `${dir}/${reason}-${credit}-filled-return.pdf`,
          pdf,
        );
        await Deno.writeTextFile(
          `${dir}/${reason}-${credit}-full-return.xml`,
          prepared.bundle.xml,
        );
      }
    });
  }
}

Deno.test("missing 1098-T source conditions and return joins reject incomplete or conflicting evidence", () => {
  const original = student("aoc");
  const pending = returnCase(original);
  const wp = original.education_expense_workpaper!;
  const rejected = (item: unknown) => {
    assertThrows(() => returnCase(itemSchema.parse(item)));
    assertThrows(() =>
      native.build(inputSchema.parse({ ...pending.f8863, f8863s: [item] }), {
        pending,
        filer: base.filer,
      })
    );
    assertThrows(() =>
      form8863Pdf.instances!(
        inputSchema.parse({ ...pending.f8863, f8863s: [item] }),
        base.filer,
        pending as Record<string, Record<string, unknown>>,
      )
    );
  };
  for (
    const changes of [
      { missing_1098t_exception: undefined },
      { form1098t_document_id: "invented-1098T" },
      { form1098t_box1_payments: 4_000 },
      { form1098t_box5_scholarships: 0 },
      { paid_tuition_required_fees: 3_999 },
      { tax_free_assistance_applied_to_expenses: 1 },
      { payment_record_ids: [] },
    ]
  ) {
    rejected({
      ...original,
      education_expense_workpaper: { ...wp, ...changes },
    });
  }
  for (
    const changes of [
      { eligible_educational_institution: false },
      { eligible_institution_record_id: "" },
      { student_enrolled: false },
      { enrolled_in_degree_or_credential_program: false },
      { enrollment_record_id: "" },
      { student_ssn: "999887777" },
      { institution_name: "Wrong School" },
      { academic_period_start_date: "2026-04-01" },
      { payment_tax_year: 2024 },
      { assistance_record_id: "" },
      { nonreceipt_basis_record_id: "" },
      { requested_1098t_date: "2026-01-31" },
      { requested_1098t_date: "2026-04-01" },
      { requested_1098t_date: "2026-04-02" },
      { request_record_id: "" },
      { fully_cooperated: false },
      { cooperation_record_id: "" },
      { institution_required_to_furnish_1098t: false },
    ]
  ) {
    rejected({
      ...original,
      education_expense_workpaper: {
        ...wp,
        missing_1098t_exception: { ...required, ...changes },
      },
    });
  }
  for (
    const furnishingChanges of [
      { separate_student_financial_account: true },
      { qualified_tuition_covered_by_formal_billing: false },
      { billing_counterparty: "family" },
      { billing_arrangement_record_id: "" },
      { covered_qualified_tuition_payment_amount: 3_999 },
      { taxable_payment_amount: 3_999 },
      { taxable_amount_in_student_gross_income: 0 },
      { student_gross_income_record_id: undefined },
      { payment_tax_treatment_record_id: "" },
      { covered_payment_record_ids: ["wrong-payment"] },
      {
        taxable_payment_amount: 0,
        taxable_amount_in_student_gross_income: 0,
        tax_free_section127_payment_amount: 4_000,
      },
      {
        taxable_payment_amount: 0,
        taxable_amount_in_student_gross_income: 0,
        other_tax_free_payment_amount: 4_000,
      },
    ]
  ) {
    rejected({
      ...original,
      education_expense_workpaper: {
        ...wp,
        missing_1098t_exception: {
          ...exempt,
          furnishing_basis: {
            ...exempt.furnishing_basis,
            ...furnishingChanges,
          },
        },
      },
    });
  }
  // All monetary facts reconcile here; absence of the exclusion record alone
  // must still reject the alleged section 127 treatment.
  rejected({
    ...original,
    aoc_adjusted_expenses: 3_500,
    education_expense_workpaper: {
      ...wp,
      tax_free_assistance_applied_to_expenses: 500,
      missing_1098t_exception: {
        ...exempt,
        furnishing_basis: {
          ...exempt.furnishing_basis,
          taxable_payment_amount: 3_500,
          taxable_amount_in_student_gross_income: 3_500,
          tax_free_section127_payment_amount: 500,
          section127_exclusion_record_id: undefined,
        },
      },
    },
  });
  rejected({
    ...original,
    education_expense_workpaper: {
      ...wp,
      missing_1098t_exception: {
        ...exempt,
        institution_required_to_furnish_1098t: true,
      },
    },
  });
  rejected({
    ...original,
    education_expense_workpaper: {
      ...wp,
      missing_1098t_exception: { ...exempt, furnishing_basis: undefined },
    },
  });
  rejected({
    ...original,
    education_expense_workpaper: {
      ...wp,
      missing_1098t_exception: {
        ...exempt,
        furnishing_basis: {
          kind: "noncredit_courses_only",
          all_courses_noncredit: true,
        },
      },
    },
  });
  rejected({
    ...original,
    filing_details: {
      ...original.filing_details,
      institutions: [{
        ...original.filing_details!.institutions[0],
        ein: undefined,
      }],
    },
  });
  rejected({
    ...original,
    filing_details: {
      ...original.filing_details,
      institutions: [{
        ...original.filing_details!.institutions[0],
        current_year_1098t_received: true,
      }],
    },
  });
  for (
    const changed of [
      {
        ...pending,
        schedule3: { ...pending.schedule3, line3_education_credit: 1_499 },
      },
      { ...pending, f1040: { ...pending.f1040, line29_refundable_aoc: 999 } },
      {
        ...pending,
        f1040: { ...pending.f1040, line18_total_tax_before_credits: 7_954 },
      },
    ]
  ) {
    assertThrows(() =>
      native.build(pending.f8863!, { pending: changed, filer: base.filer })
    );
    assertThrows(() =>
      form8863Pdf.instances!(pending.f8863!, base.filer, {
        f1040: changed.f1040!,
        schedule3: changed.schedule3!,
      })
    );
  }
});

Deno.test("waived and scholarship missing-form basis cannot invent paid or untaxed credit expenses", () => {
  const original = student("aoc");
  const wp = original.education_expense_workpaper!;
  const taxableBasis = {
    kind: "expenses_waived_or_paid_entirely_with_scholarships",
    qualified_tuition_entirely_waived_or_scholarship_paid: true,
    waived_qualified_tuition_amount: 0,
    scholarship_paid_qualified_tuition_amount: 4_000,
    tax_free_scholarship_payment_amount: 0,
    taxable_scholarship_payment_amount: 4_000,
    scholarship_terms_record_id:
      "2025-scholarship-terms-permit-nonqualified-use",
    scholarship_terms_allow_taxable_allocation: true,
    taxable_allocation_record_id:
      "2025-student-scholarship-allocation-workpaper",
    taxable_amount_in_student_gross_income: 4_000,
    student_gross_income_record_id:
      "2025-student-income-includes-4000-scholarship",
  };
  const changed = (basis: unknown, sourceChanges = {}, itemChanges = {}) =>
    itemSchema.parse({
      ...original,
      ...itemChanges,
      education_expense_workpaper: {
        ...wp,
        ...sourceChanges,
        missing_1098t_exception: { ...exempt, furnishing_basis: basis },
      },
    });
  // Admission of the source contract is conditional on all three economic
  // records; this is not a full-return or authenticated scholarship packet.
  validateForm8863FilingSource(changed(taxableBasis), "aoc");
  for (
    const changes of [
      { scholarship_terms_allow_taxable_allocation: false },
      { scholarship_terms_record_id: "" },
      { taxable_allocation_record_id: undefined },
      { student_gross_income_record_id: undefined },
      { taxable_amount_in_student_gross_income: 0 },
      { scholarship_paid_qualified_tuition_amount: 3_999 },
      {
        waived_qualified_tuition_amount: 4_000,
        scholarship_paid_qualified_tuition_amount: 0,
        taxable_scholarship_payment_amount: 0,
        taxable_amount_in_student_gross_income: 0,
      },
      {
        tax_free_scholarship_payment_amount: 4_000,
        taxable_scholarship_payment_amount: 0,
        taxable_amount_in_student_gross_income: 0,
      },
    ]
  ) {
    assertThrows(() =>
      validateForm8863FilingSource(
        changed({ ...taxableBasis, ...changes }),
        "aoc",
      )
    );
  }
  const fullyTaxFree = changed(
    {
      ...taxableBasis,
      tax_free_scholarship_payment_amount: 4_000,
      taxable_scholarship_payment_amount: 0,
      taxable_amount_in_student_gross_income: 0,
      scholarship_terms_allow_taxable_allocation: false,
      taxable_allocation_record_id: undefined,
      student_gross_income_record_id: undefined,
    },
    { tax_free_assistance_applied_to_expenses: 4_000 },
    { aoc_adjusted_expenses: 0 },
  );
  validateForm8863FilingSource(fullyTaxFree, "aoc");
  const pending = returnCase(fullyTaxFree);
  assertEquals(pending.schedule3?.line3_education_credit ?? 0, 0);
  assertEquals(pending.f1040!.line29_refundable_aoc ?? 0, 0);
});

for (
  const scenario of [
    {
      amount: 4_000,
      magi: 79_000,
      tax: 8_835,
      totalTax: 7_335,
      nonrefundable: 1_500,
      refundable: 1_000,
      prefix: "scholarship-aoc",
    },
    {
      amount: 6_000,
      magi: 81_000,
      tax: 9_275,
      totalTax: 7_925,
      nonrefundable: 1_350,
      refundable: 900,
      prefix: "scholarship-aoc-phaseout",
    },
  ]
) {
  Deno.test(`taxable scholarship ${scenario.amount} missing-form credit routes through Schedule 1, AGI, native XML and filled packet`, async () => {
    const amount = scenario.amount;
    const source = {
      kind: "scholarship_not_on_w2",
      student_ssn: base.filer.primarySSN,
      source_document_reference:
        `2025-student-income-includes-${amount}-scholarship`,
      tax_year: 2025,
      taxable_amount: amount,
      payer_name: "Test University",
      nonqualified_expenses_paid: amount,
      nonqualified_expense_payment_record_ids: ["2025-Alex-room-board-payment"],
      scholarship_terms_record_id:
        "2025-scholarship-terms-permit-nonqualified-use",
      taxable_allocation_record_id:
        "2025-student-scholarship-allocation-workpaper",
    };
    const item = itemSchema.parse({
      ...student("aoc"),
      filer_magi: scenario.magi,
      aoc_adjusted_expenses: amount,
      education_expense_workpaper: {
        ...student("aoc").education_expense_workpaper,
        paid_tuition_required_fees: amount,
        missing_1098t_exception: {
          ...exempt,
          furnishing_basis: {
            kind: "expenses_waived_or_paid_entirely_with_scholarships",
            qualified_tuition_entirely_waived_or_scholarship_paid: true,
            waived_qualified_tuition_amount: 0,
            scholarship_paid_qualified_tuition_amount: amount,
            tax_free_scholarship_payment_amount: 0,
            taxable_scholarship_payment_amount: amount,
            scholarship_terms_record_id: source.scholarship_terms_record_id,
            scholarship_terms_allow_taxable_allocation: true,
            taxable_allocation_record_id: source.taxable_allocation_record_id,
            taxable_amount_in_student_gross_income: amount,
            student_gross_income_record_id: source.source_document_reference,
          },
        },
      },
    });
    const inputs = {
      ...reviewedInputs,
      education_income: [source],
      f8863: [item],
      f8863_credit_limit_worksheet: {
        credit_limit_worksheet: {
          form1040_line18_tax: scenario.tax,
          schedule3_line1_foreign_tax_credit: 0,
          schedule3_line2_dependent_care_credit: 0,
          schedule3_line6d: 0,
          schedule3_line6l: 0,
        },
      },
    };
    const result = execute(buildExecutionPlan(registry), registry, inputs, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    assertEquals(pending.f1040!.line1a_wages, 75_000);
    assertEquals(pending.schedule1!.line8r_taxable_scholarships, amount);
    assertEquals(pending.schedule1!.line9_total_other_income, amount);
    assertEquals(pending.schedule1!.line10_total_additional_income, amount);
    assertEquals(pending.f1040!.line8_additional_income, amount);
    assertEquals(pending.f1040!.line11_agi, scenario.magi);
    assertEquals(pending.f1040!.line18_total_tax_before_credits, scenario.tax);
    assertEquals(pending.f1040!.line24_total_tax, scenario.totalTax);
    assertEquals(
      pending.schedule3!.line3_education_credit,
      scenario.nonrefundable,
    );
    assertEquals(pending.f1040!.line29_refundable_aoc, scenario.refundable);
    const prepared = await f1040_2025.prepareReturn(pending, base.filer);
    assertStringIncludes(
      prepared.bundle.xml,
      `<GrantsOrScholarshipsAmt>${amount}</GrantsOrScholarshipsAmt>`,
    );
    if (xsdAvailable) await validateXml(prepared.bundle.xml);
    const pdf = await prepared.renderPdf();
    const doc = await PDFDocument.load(pdf);
    assertEquals(doc.getPageCount(), 7);
    assertEquals(doc.getForm().getFields().length, 0);
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, pdf);
      const output = await new Deno.Command("pdftotext", {
        args: ["-layout", path, "-"],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(output.code, 0);
      const text = new TextDecoder().decode(output.stdout);
      assertEquals(new RegExp(`8r\\s+${amount}`).test(text), true);
      assertEquals(new RegExp(`24\\s+${scenario.totalTax}`).test(text), true);
    } finally {
      await Deno.remove(path);
    }
    const permission = await Deno.permissions.query({
      name: "env",
      variable: "FORM8863_EVIDENCE_DIR",
    });
    const dir = permission.state === "granted"
      ? Deno.env.get("FORM8863_EVIDENCE_DIR")
      : undefined;
    if (dir) {
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/${scenario.prefix}-source-input.json`,
        JSON.stringify({ inputs, filer: base.filer }, null, 2),
      );
      await Deno.writeTextFile(
        `${dir}/${scenario.prefix}-full-return.xml`,
        prepared.bundle.xml,
      );
      await Deno.writeFile(`${dir}/${scenario.prefix}-filled-return.pdf`, pdf);
    }
    for (
      const changed of [
        {
          ...pending,
          f8863: {
            ...pending.f8863!,
            f8863s: [{ ...item, filer_magi: 75_000 }],
          },
        },
        { ...pending, education_income: undefined },
        {
          ...pending,
          education_income: {
            education_incomes: [{
              ...source,
              source_document_reference: "detached-income-record",
            }],
          },
        },
        {
          ...pending,
          education_income: {
            education_incomes: [{ ...source, taxable_amount: amount - 1 }],
          },
        },
        {
          ...pending,
          education_income: {
            education_incomes: [{ ...source, student_ssn: "999887777" }],
          },
        },
        {
          ...pending,
          education_income: {
            education_incomes: [{
              ...source,
              taxable_allocation_record_id: "changed-allocation",
            }],
          },
        },
        {
          ...pending,
          education_income: {
            education_incomes: [{
              ...source,
              scholarship_terms_record_id: "changed-terms",
            }],
          },
        },
        {
          ...pending,
          education_income: {
            education_incomes: [{
              ...source,
              nonqualified_expenses_paid: amount - 1,
            }],
          },
        },
        {
          ...pending,
          agi_aggregator: {
            ...pending.agi_aggregator,
            line8r_taxable_scholarships: 0,
          },
        },
        { ...pending, schedule1: undefined },
        {
          ...pending,
          schedule1: { ...pending.schedule1, line9_total_other_income: 0 },
        },
        { ...pending, f1040: { ...pending.f1040, line9_total_income: 75_000 } },
        {
          ...pending,
          schedule1: { ...pending.schedule1, line8r_taxable_scholarships: 0 },
        },
        { ...pending, f1040: { ...pending.f1040, line8_additional_income: 0 } },
      ]
    ) {
      assertThrows(() =>
        native.build(changed.f8863!, { pending: changed, filer: base.filer })
      );
      assertThrows(() =>
        form8863Pdf.instances!(
          changed.f8863!,
          base.filer,
          changed as unknown as Record<string, Record<string, unknown>>,
        )
      );
      await assertRejects(() => f1040_2025.prepareReturn(changed, base.filer));
    }
  });
}

Deno.test("taxable employer education joins reject detached and changed issued income copies", async () => {
  const pending = returnCase(student("aoc", exempt));
  const originalW2 = pending.w2!.w2s![0];
  const originalIncome = pending.education_income!.education_incomes[0];
  for (
    const changed of [
      { ...pending, education_income: undefined },
      {
        ...pending,
        education_income: {
          education_incomes: [{ ...originalIncome, taxable_amount: 3_999 }],
        },
      },
      {
        ...pending,
        education_income: {
          education_incomes: [{ ...originalIncome, w2_box1_wages: 74_999 }],
        },
      },
      { ...pending, w2: undefined },
      ...[
        { source_document_reference: "detached-issued-copy" },
        { box1_wages: 74_999 },
        { employee_ssn: "999887777" },
        { employer_ein: "98-7654321" },
      ].map((change) => ({
        ...pending,
        w2: { w2s: [{ ...originalW2, ...change }] },
      })),
      { ...pending, f1040: { ...pending.f1040, line1a_wages: 74_999 } },
    ]
  ) {
    assertThrows(() =>
      native.build(pending.f8863!, { pending: changed, filer: base.filer })
    );
    assertThrows(() =>
      form8863Pdf.instances!(
        pending.f8863!,
        base.filer,
        changed as unknown as Record<string, Record<string, unknown>>,
      )
    );
    await assertRejects(() => f1040_2025.prepareReturn(changed, base.filer));
  }
});
