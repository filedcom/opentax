import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../index.ts";
import { inputSchema, itemSchema } from "../../nodes/inputs/f8863/index.ts";
import { form8863 } from "../mef/forms/f8863.ts";
import { form8863Pdf } from "./forms/f8863.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((row) => row.id === "single-w2-refund")!;
const filer = { ...base.filer, timestamp: "2026-04-01T12:00:00Z" };
const ssn = filer.primarySSN;
const first = {
  name: "Issued University",
  ein: "12-3456789",
  us_address: {
    line1: "1 University Road",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  current_year_1098t_received: true,
  prior_year_1098t_received: false,
};
const second = {
  name: "Missing College",
  ein: "98-7654321",
  us_address: {
    line1: "2 College Road",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  current_year_1098t_received: false,
  prior_year_1098t_received: false,
};
const expenses = {
  paid_course_materials_to_institution: 0,
  paid_course_materials_elsewhere: 0,
  outside_materials_needed_for_course: false,
  institution_materials_required_for_enrollment: false,
  qualified_expense_refunds: 0,
  expenses_used_for_other_tax_benefits: 0,
};
function fixture(credit: "aoc" | "llc", reason: "required" | "scholarship") {
  const firstPaid = credit === "aoc" ? 2_500 : 5_500;
  const secondPaid = reason === "required" ? 3_000 : 6_000;
  const scholarship = reason === "scholarship";
  const income = {
    kind: "scholarship_not_on_w2",
    student_ssn: ssn,
    source_document_reference:
      "2025-Missing-College-taxable-scholarship-income",
    tax_year: 2025,
    taxable_amount: 6_000,
    payer_name: second.name,
    scholarship_terms_record_id: "2025-Missing-College-scholarship-terms",
    taxable_allocation_record_id: "2025-Missing-College-allocation",
    nonqualified_expenses_paid: 6_000,
    nonqualified_expense_payment_record_ids: [
      "2025-Alex-nonqualified-room-board",
    ],
  };
  const commonException = {
    student_ssn: ssn,
    institution_name: second.name,
    eligible_educational_institution: true,
    eligible_institution_record_id: "2025-Missing-College-eligible-institution",
    student_enrolled: true,
    enrolled_in_degree_or_credential_program: true,
    enrollment_record_id: "2025-Missing-College-Alex-enrollment",
    academic_period_start_date: "2025-09-01",
    payment_tax_year: 2025,
    assistance_record_id: "2025-Missing-College-Alex-assistance-review",
    nonreceipt_basis_record_id: "2025-Missing-College-nonreceipt-review",
  };
  const missingException = scholarship
    ? {
      ...commonException,
      reason: "institution_not_required",
      institution_required_to_furnish_1098t: false,
      furnishing_basis: {
        kind: "expenses_waived_or_paid_entirely_with_scholarships",
        qualified_tuition_entirely_waived_or_scholarship_paid: true,
        waived_qualified_tuition_amount: 0,
        scholarship_paid_qualified_tuition_amount: 6_000,
        tax_free_scholarship_payment_amount: 0,
        taxable_scholarship_payment_amount: 6_000,
        scholarship_terms_record_id: income.scholarship_terms_record_id,
        scholarship_terms_allow_taxable_allocation: true,
        taxable_allocation_record_id: income.taxable_allocation_record_id,
        taxable_amount_in_student_gross_income: 6_000,
        student_gross_income_record_id: income.source_document_reference,
      },
    }
    : {
      ...commonException,
      reason: "required_but_not_received",
      institution_required_to_furnish_1098t: true,
      requested_1098t_date: "2026-02-02",
      request_record_id: "2026-Missing-College-Alex-request",
      fully_cooperated: true,
      cooperation_record_id: "2026-Missing-College-Alex-cooperation",
      return_filing_date: "2026-04-01",
    };
  const issuedWorkpaper = {
    ...expenses,
    form1098t_document_id: "2025-Issued-University-Alex-1098T",
    form1098t_box1_payments: firstPaid,
    form1098t_box5_scholarships: 500,
    issued_form1098t_source: {
      student_ssn: ssn,
      institution_name: first.name,
      institution_ein: first.ein,
      tax_year: 2025,
      document_id: "2025-Issued-University-Alex-1098T",
      box1_payments: firstPaid,
      box5_scholarships: 500,
    },
    payment_record_ids: ["2025-Issued-University-Alex-tuition"],
    paid_tuition_required_fees: firstPaid,
    payment_sources: [{
      student_ssn: ssn,
      institution_name: first.name,
      tax_year: 2025,
      payment_record_id: "2025-Issued-University-Alex-tuition",
      category: "tuition_required_fees",
      amount: firstPaid,
    }],
    tax_free_assistance_applied_to_expenses: 500,
    assistance_sources: [{
      student_ssn: ssn,
      institution_name: first.name,
      tax_year: 2025,
      source_document_reference: "2025-Issued-University-Alex-tax-free-award",
      amount: 500,
      tax_treatment: "tax_free",
    }],
  };
  const missingWorkpaper = {
    ...expenses,
    missing_1098t_exception: missingException,
    payment_record_ids: ["2025-Missing-College-Alex-tuition"],
    paid_tuition_required_fees: secondPaid,
    payment_sources: [{
      student_ssn: ssn,
      institution_name: second.name,
      tax_year: 2025,
      payment_record_id: "2025-Missing-College-Alex-tuition",
      category: "tuition_required_fees",
      amount: secondPaid,
    }],
    tax_free_assistance_applied_to_expenses: 0,
    assistance_sources: scholarship
      ? [{
        student_ssn: ssn,
        institution_name: second.name,
        tax_year: 2025,
        source_document_reference: "2025-Missing-College-Alex-taxable-award",
        amount: 6_000,
        tax_treatment: "taxable",
        student_income_source_reference: income.source_document_reference,
      }]
      : [],
  };
  const missingSchool = credit === "llc"
    ? { ...second, ein: undefined }
    : second;
  const adjusted = firstPaid - 500 + secondPaid;
  const item = itemSchema.parse({
    credit_type: credit,
    student_name: "Alex Example",
    student_ssn: ssn,
    filing_status: "single",
    filer_magi: scholarship ? 81_000 : 75_000,
    ...(credit === "aoc"
      ? { aoc_adjusted_expenses: adjusted }
      : { llc_adjusted_expenses: adjusted }),
    aoc_claimed_4_prior_years: false,
    enrolled_half_time: true,
    completed_4_years_postsec: false,
    felony_drug_conviction: false,
    taxpayer_under_24_no_refundable_aoc: false,
    filing_details: {
      first_name: "Alex",
      last_name: "Example",
      name_control: "EXAM",
      institutions: [first, missingSchool],
    },
    institution_expense_workpapers: [
      {
        institution_name: first.name,
        institution_ein: first.ein,
        workpaper: issuedWorkpaper,
      },
      {
        institution_name: second.name,
        institution_ein: missingSchool.ein,
        workpaper: missingWorkpaper,
      },
    ],
  });
  const inputs = {
    ...base.inputs,
    f8863: [item],
    ...(scholarship ? { education_income: [income] } : {}),
    f8863_credit_limit_worksheet: {
      credit_limit_worksheet: {
        form1040_line18_tax: scholarship ? 9_275 : 7_955,
        schedule3_line1_foreign_tax_credit: 0,
        schedule3_line2_dependent_care_credit: 0,
        schedule3_line6d: 0,
        schedule3_line6l: 0,
      },
    },
  };
  return { inputs, item, adjusted, income };
}
const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
async function validateXml(xml: string) {
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
}
for (const credit of ["aoc", "llc"] as const) {
  for (const reason of ["required", "scholarship"] as const) {
    Deno.test(`mixed two-school ${credit} ${reason} source calculation/native/PDF/full XSD packet`, async () => {
      const source = fixture(credit, reason);
      const result = f1040_2025.executeReturn(source.inputs);
      assertEquals(result.diagnostics, []);
      const pending = result.pending;
      const scholarship = reason === "scholarship";
      const nonrefundable = credit === "aoc"
        ? scholarship ? 1_350 : 1_500
        : scholarship
        ? 1_800
        : 1_600;
      const refundable = credit === "aoc" ? scholarship ? 900 : 1_000 : 0;
      assertEquals(pending.f1040.line1a_wages, 75_000);
      assertEquals(pending.f1040.line11_agi, scholarship ? 81_000 : 75_000);
      assertEquals(
        pending.f1040.line8_additional_income ?? 0,
        scholarship ? 6_000 : 0,
      );
      assertEquals(pending.schedule3.line3_education_credit, nonrefundable);
      assertEquals(pending.f1040.line29_refundable_aoc ?? 0, refundable);
      assertEquals(
        pending.f1040.line24_total_tax,
        (scholarship ? 9_275 : 7_955) - nonrefundable,
      );
      if (scholarship) {
        assertEquals(pending.schedule1.line8r_taxable_scholarships, 6_000);
      }
      const prepared = await f1040_2025.prepareReturn(pending, filer);
      const groups = [
        ...prepared.bundle.xml.matchAll(
          /<EducationalInstitutionGroup>(.*?)<\/EducationalInstitutionGroup>/gs,
        ),
      ].map((match) => match[1]);
      assertEquals(groups.length, 2);
      assertStringIncludes(
        groups[0],
        "<BusinessNameLine1Txt>Issued University</BusinessNameLine1Txt>",
      );
      assertStringIncludes(
        groups[0],
        "<CurrentYear1098TReceivedInd>true</CurrentYear1098TReceivedInd>",
      );
      assertStringIncludes(
        groups[1],
        "<BusinessNameLine1Txt>Missing College</BusinessNameLine1Txt>",
      );
      assertStringIncludes(
        groups[1],
        "<CurrentYear1098TReceivedInd>false</CurrentYear1098TReceivedInd>",
      );
      assertEquals(groups[1].includes("<EIN>"), credit === "aoc");
      assertStringIncludes(
        prepared.bundle.xml,
        credit === "aoc"
          ? "<AmerOppQualifiedExpensesAmt>4000</AmerOppQualifiedExpensesAmt>"
          : "<LifetimeQualifiedExpensesAmt>" + source.adjusted +
            "</LifetimeQualifiedExpensesAmt>",
      );
      const [projected] = form8863Pdf.instances!(
        pending.f8863,
        filer,
        pending,
      );
      assertEquals(projected.pdf_institution_0_current_1098t, "yes");
      assertEquals(projected.pdf_institution_1_current_1098t, "no");
      assertEquals(
        projected[credit === "aoc" ? "pdf_line27" : "pdf_line31"],
        credit === "aoc" ? 4_000 : source.adjusted,
      );
      if (credit === "llc") {
        assertEquals(projected.line10, source.adjusted);
        assertEquals(projected.line11, Math.min(10_000, source.adjusted));
        assertEquals(projected.line12, Math.min(10_000, source.adjusted) * 0.2);
      }
      assertEquals(projected.pdf_institution_0_name, first.name);
      assertEquals(projected.pdf_institution_1_name, second.name);
      await validateXml(prepared.bundle.xml);
      const pdf = await prepared.renderPdf();
      const doc = await PDFDocument.load(pdf);
      assertEquals(doc.getPageCount(), scholarship ? 7 : 5);
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
        assertStringIncludes(text, first.name);
        assertStringIncludes(text, second.name);
        assertEquals(new RegExp(`19\\s+${nonrefundable}`).test(text), true);
      } finally {
        await Deno.remove(path);
      }
      if (Deno.args.includes("--write-review-artifacts")) {
        const dir = "/tmp/opentax-f8863-mixed-evidence";
        await Deno.mkdir(dir, { recursive: true });
        const prefix = `${dir}/${credit}-${reason}`;
        await Deno.writeTextFile(
          `${prefix}-source-input.json`,
          JSON.stringify({ inputs: source.inputs, filer: filer }, null, 2),
        );
        await Deno.writeTextFile(
          `${prefix}-full-return.xml`,
          prepared.bundle.xml,
        );
        await Deno.writeFile(`${prefix}-filled-return.pdf`, pdf);
      }
      const reversed = f1040_2025.executeReturn({
        ...source.inputs,
        f8863: [{
          ...source.item,
          institution_expense_workpapers: [
            ...source.item.institution_expense_workpapers!,
          ].reverse(),
        }],
      });
      assertEquals(reversed.diagnostics, []);
      assertEquals(
        reversed.pending.f1040.line24_total_tax,
        pending.f1040.line24_total_tax,
      );
      const reordered = await f1040_2025.prepareReturn(
        reversed.pending,
        filer,
      );
      assertEquals(reordered.bundle.xml, prepared.bundle.xml);
    });
  }
}

Deno.test("mixed-school source identities, payment/aid ledgers, exception and income joins reject crossed sources", async () => {
  const source = fixture("aoc", "scholarship");
  const result = f1040_2025.executeReturn(source.inputs);
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  const schools = source.item.institution_expense_workpapers!;
  const firstWp = schools[0].workpaper;
  const secondWp = schools[1].workpaper;
  const changedFirst = (changes: Record<string, unknown>) => ({
    ...source.item,
    institution_expense_workpapers: [{
      ...schools[0],
      workpaper: { ...firstWp, ...changes },
    }, schools[1]],
  });
  const changedSecond = (changes: Record<string, unknown>) => ({
    ...source.item,
    institution_expense_workpapers: [schools[0], {
      ...schools[1],
      workpaper: { ...secondWp, ...changes },
    }],
  });
  const invalidItems = [
    {
      ...source.item,
      institution_expense_workpapers: [{
        ...schools[0],
        institution_ein: second.ein,
      }, { ...schools[1], institution_ein: first.ein }],
    },
    {
      ...source.item,
      institution_expense_workpapers: [schools[0], schools[0]],
    },
    {
      ...source.item,
      institution_expense_workpapers: [{
        ...schools[0],
        institution_name: second.name,
      }, schools[1]],
    },
    changedFirst({ issued_form1098t_source: undefined }),
    ...[
      { student_ssn: "999887777" },
      { institution_name: second.name },
      { institution_ein: second.ein },
      { document_id: "detached-copy" },
      { box1_payments: 2_499 },
      { box5_scholarships: 499 },
    ].map((change) =>
      changedFirst({
        issued_form1098t_source: {
          ...firstWp.issued_form1098t_source!,
          ...change,
        },
      })
    ),
    changedFirst({ payment_sources: undefined }),
    changedFirst({
      payment_sources: [{ ...firstWp.payment_sources![0], amount: 2_499 }],
    }),
    changedFirst({
      payment_sources: [{
        ...firstWp.payment_sources![0],
        institution_name: second.name,
      }],
    }),
    changedFirst({ assistance_sources: undefined }),
    changedFirst({
      assistance_sources: [{ ...firstWp.assistance_sources![0], amount: 499 }],
    }),
    changedFirst({
      assistance_sources: [{
        ...firstWp.assistance_sources![0],
        student_ssn: "999887777",
      }],
    }),
    changedSecond({
      payment_record_ids: firstWp.payment_record_ids,
      payment_sources: [{
        ...secondWp.payment_sources![0],
        payment_record_id: firstWp.payment_record_ids[0],
      }],
    }),
    changedSecond({
      payment_sources: [{
        ...secondWp.payment_sources![0],
        student_ssn: "999887777",
      }],
    }),
    changedSecond({
      assistance_sources: [{
        ...secondWp.assistance_sources![0],
        source_document_reference:
          firstWp.assistance_sources![0].source_document_reference,
      }],
    }),
    changedSecond({
      assistance_sources: [{
        ...secondWp.assistance_sources![0],
        tax_treatment: "tax_free",
      }],
    }),
    changedSecond({
      assistance_sources: [{
        ...secondWp.assistance_sources![0],
        student_income_source_reference: "detached-income",
      }],
    }),
    changedSecond({ form1098t_document_id: "invented-missing-form" }),
    changedSecond({
      missing_1098t_exception: {
        ...secondWp.missing_1098t_exception!,
        institution_name: first.name,
      },
    }),
    { ...source.item, aoc_adjusted_expenses: 7_999 },
  ];
  for (const item of invalidItems) {
    const calculated = f1040_2025.executeReturn({
      ...source.inputs,
      f8863: [item],
    });
    assertEquals(calculated.diagnostics.length > 0, true);
    const fields = { ...pending.f8863, f8863s: [item] };
    assertThrows(() =>
      form8863.build(fields as never, { pending, filer: filer })
    );
    assertThrows(() => form8863Pdf.instances!(fields, filer, pending));
    await assertRejects(() =>
      f1040_2025.prepareReturn(
        { ...pending, f8863: fields } as never,
        filer,
      )
    );
  }
  for (
    const changed of [
      {
        ...pending,
        education_income: {
          education_incomes: [{
            ...source.income,
            nonqualified_expense_payment_record_ids: firstWp.payment_record_ids,
          }],
        },
      },
      { ...pending, education_income: undefined },
      {
        ...pending,
        education_income: {
          education_incomes: [{ ...source.income, payer_name: first.name }],
        },
      },
      {
        ...pending,
        education_income: {
          education_incomes: [{
            ...source.income,
            source_document_reference: "detached-income",
          }],
        },
      },
      {
        ...pending,
        schedule1: { ...pending.schedule1, line8r_taxable_scholarships: 0 },
      },
    ]
  ) {
    assertThrows(() =>
      form8863.build(inputSchema.parse(pending.f8863), {
        pending: changed,
        filer: filer,
      })
    );
    assertThrows(() =>
      form8863Pdf.instances!(
        pending.f8863,
        filer,
        changed as unknown as Record<string, Record<string, unknown>>,
      )
    );
    await assertRejects(() => f1040_2025.prepareReturn(changed, filer));
  }
});

Deno.test("mixed required missing school retains its own request, payment and enrollment conditions", async () => {
  const source = fixture("llc", "required");
  const result = f1040_2025.executeReturn(source.inputs);
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  const schools = source.item.institution_expense_workpapers!;
  const missing = schools[1].workpaper;
  for (
    const change of [
      { requested_1098t_date: "2026-01-31" },
      { requested_1098t_date: "2026-04-01" },
      { institution_name: first.name },
      { student_ssn: "999887777" },
      { academic_period_start_date: "2026-04-01" },
    ]
  ) {
    const item = {
      ...source.item,
      institution_expense_workpapers: [schools[0], {
        ...schools[1],
        workpaper: {
          ...missing,
          missing_1098t_exception: {
            ...missing.missing_1098t_exception!,
            ...change,
          },
        },
      }],
    };
    const calculated = f1040_2025.executeReturn({
      ...source.inputs,
      f8863: [item],
    });
    assertEquals(calculated.diagnostics.length > 0, true);
    const fields = { ...pending.f8863, f8863s: [item] };
    assertThrows(() =>
      form8863.build(inputSchema.parse(fields), { pending, filer })
    );
    assertThrows(() => form8863Pdf.instances!(fields, filer, pending));
    await assertRejects(() =>
      f1040_2025.prepareReturn({ ...pending, f8863: fields } as never, filer)
    );
  }
});
