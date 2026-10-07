import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../index.ts";
import { itemSchema } from "../../nodes/inputs/f8863/index.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-form8863-lifetime-learning-scholarship"
)!;
const original = itemSchema.parse((base.inputs.f8863 as unknown[])[0]);
const first = original.filing_details!.institutions[0];
const second = {
  ...first,
  name: "Second College",
  ein: "98-7654321",
  us_address: {
    line1: "2 College Road",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
};
const firstSource = original.education_expense_workpaper!;
const secondSource = {
  ...firstSource,
  form1098t_box1_payments: 2_500,
  form1098t_box5_scholarships: 0,
  form1098t_document_id: "SECOND-SCHOOL-2025-1098T",
  payment_record_ids: ["SECOND-SCHOOL-2025-TUITION"],
  paid_tuition_required_fees: 2_500,
  paid_course_materials_to_institution: 0,
  institution_materials_requirement_record_id: undefined,
  institution_materials_payment_record_id: undefined,
  tax_free_assistance_applied_to_expenses: 0,
};
const student = {
  ...original,
  education_expense_workpaper: undefined,
  institution_expense_workpapers: [
    { institution_ein: first.ein!, workpaper: firstSource },
    { institution_ein: second.ein, workpaper: secondSource },
  ],
  filing_details: {
    ...original.filing_details!,
    institutions: [first, second],
  },
  llc_adjusted_expenses: 10_000,
};

Deno.test("two school American Opportunity expenses share the student cap", async () => {
  const result = f1040_2025.executeReturn(
    pdfReviewFixtures.find((fixture) =>
      fixture.id === "single-form8863-two-school-aoc"
    )!.inputs,
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule3.line3_education_credit, 1_500);
  assertEquals(result.pending.f1040.line29_refundable_aoc, 1_000);
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  assertEquals(
    (prepared.bundle.xml.match(/<EducationalInstitutionGroup>/g) ?? []).length,
    2,
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<AmerOppQualifiedExpensesAmt>4000</AmerOppQualifiedExpensesAmt>",
  );
  const pdf = await prepared.renderPdf();
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, prepared.bundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        new URL(
          "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
          import.meta.url,
        ).pathname,
        xmlPath,
      ],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir = "/tmp/opentax-form8863-two-schools-aoc-review";
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeFile(`${dir}/filled-return.pdf`, pdf);
      await Deno.writeTextFile(`${dir}/return.xml`, prepared.bundle.xml);
    }
  } finally {
    await Deno.remove(xmlPath);
  }
});

Deno.test("two school expense workpapers reach Form 8863, final tax, XSD and filled PDF", async () => {
  const result = f1040_2025.executeReturn(
    pdfReviewFixtures.find((fixture) =>
      fixture.id === "single-form8863-two-school-llc"
    )!.inputs,
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule3.line3_education_credit, 2_000);
  assertEquals(result.pending.f1040.line20_nonrefundable_credits, 2_000);
  assertEquals(result.pending.f1040.line22_tax_after_credits, 5_955);
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  assertEquals(
    (prepared.bundle.xml.match(/<EducationalInstitutionGroup>/g) ?? []).length,
    2,
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<TotalQualifiedExpensesAmt>10000</TotalQualifiedExpensesAmt>",
  );
  const xsd = new URL(
    "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeTextFile(xmlPath, prepared.bundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    const pdf = await prepared.renderPdf();
    await Deno.writeFile(pdfPath, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0);
    const text = new TextDecoder().decode(extracted.stdout);
    assertStringIncludes(text, first.name);
    assertStringIncludes(text, second.name);
    assertStringIncludes(text, "10000");
    if (Deno.args.includes("--write-review-artifacts")) {
      await Deno.mkdir("/tmp/opentax-form8863-two-schools-review", {
        recursive: true,
      });
      await Deno.writeFile(
        "/tmp/opentax-form8863-two-schools-review/filled-return.pdf",
        pdf,
      );
      await Deno.writeTextFile(
        "/tmp/opentax-form8863-two-schools-review/return.xml",
        prepared.bundle.xml,
      );
    }
  } finally {
    await Deno.remove(xmlPath);
    await Deno.remove(pdfPath);
  }

  for (
    const altered of [
      { ...student, llc_adjusted_expenses: 9_999 },
      { ...student, education_expense_workpaper: firstSource },
      {
        ...student,
        institution_expense_workpapers: [
          student.institution_expense_workpapers[0],
          { institution_ein: first.ein!, workpaper: secondSource },
        ],
      },
      {
        ...student,
        institution_expense_workpapers: [
          student.institution_expense_workpapers[0],
          {
            institution_ein: second.ein,
            workpaper: {
              ...secondSource,
              payment_record_ids: firstSource.payment_record_ids,
            },
          },
        ],
      },
      {
        ...student,
        institution_expense_workpapers: [
          student.institution_expense_workpapers[0],
          {
            institution_ein: second.ein,
            workpaper: {
              ...secondSource,
              form1098t_document_id: firstSource.form1098t_document_id,
            },
          },
        ],
      },
    ]
  ) {
    await assertRejects(() =>
      f1040_2025.prepareReturn({
        ...result.pending,
        f8863: { ...result.pending.f8863, f8863s: [altered] },
      }, base.filer)
    );
  }
});
