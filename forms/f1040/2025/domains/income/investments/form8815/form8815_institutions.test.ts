import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { form8815Pdf } from "../../../../pdf/forms/income/investments/f8815.ts";
import { appendForm8815Institutions } from "../../../../pdf/forms/income/investments/f8815_institutions.ts";
import {
  institutionCases,
  institutionInputs,
} from "./form8815_institutions.fixture.ts";

for (const kind of institutionCases) {
  Deno.test(`Form 8815 complete institution list and tax: ${kind}`, async () => {
    const inputs = institutionInputs(kind);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const joint = kind === "joint-four";
    const partial = kind === "four-phaseout";
    const exclusion = joint ? 575 : partial ? 833 : 2000;
    const agi = joint ? 161425 : partial ? 101167 : 70000;
    // Line 7: .500 for 6000/12000, otherwise 1.000. Phase ratios
    // .425 joint / .167 single reduce the tentative 1000 exclusion.
    assertEquals(pending.form8815.line14, exclusion);
    assertEquals(pending.schedule_b.ee_bond_exclusion, exclusion);
    assertEquals(pending.f1040.line2b_taxable_interest ?? 0, 2000 - exclusion);
    assertEquals(pending.f1040.line11_agi, agi);
    assertEquals(
      pending.f1040.line15_taxable_income,
      agi - (joint ? 31500 : 15750),
    );
    // Single tax-table midpoints: 54,275 / 85,425. MFJ uses the
    // rate schedule: 11,157 + 22% * (129,925 - 96,950) = 18,412.
    const tax = joint ? 18412 : partial ? 13708 : 6855;
    assertEquals(pending.f1040.line24_total_tax, tax);
    assertEquals(pending.f1040.line33_total_payments, 7000);
    if (tax > 7000) assertEquals(pending.f1040.line37_amount_owed, tax - 7000);
    else assertEquals(pending.f1040.line35a_refund, 7000 - tax);
    const filer = extractFilerIdentity(pending.f1040);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals(
      (prepared.bundle.xml.match(/<EligibleEducationInstnGrp>/g) ?? []).length,
      inputs.form8815.eligible_students.length,
    );
    for (const student of inputs.form8815.eligible_students) {
      assertStringIncludes(
        prepared.bundle.xml,
        `<EligibleInstitutionNm>${student.institution_name}</EligibleInstitutionNm>`,
      );
    }
    const projected = form8815Pdf.projectFields!(pending.form8815, pending);
    assertEquals(projected.student_3_institution, "Example College 03");
    assertEquals(projected.student_4_institution, undefined);
    const origins: PdfPageOrigin[] = [];
    const bytes = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const pdf = await PDFDocument.load(bytes);
    const pages = kind === "three" ? 4 : kind === "twelve" ? 6 : 5;
    assertEquals(pdf.getPageCount(), pages);
    assertEquals(origins.length, pages);
    assertEquals(
      origins.filter((row) => row.formKey === "form8815").length,
      pages - 3,
    );
    const root = Deno.env.get("OPENTAX_FORM8815_INSTITUTION_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${kind}.pdf`, bytes);
      await Deno.writeTextFile(`${root}/${kind}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${kind}.json`,
        JSON.stringify(
          { inputs, pending, filer, origins, acceptanceVerified: false },
          null,
          2,
        ),
      );
    }
    for (
      const replacement of [
        { ...pending.form8815, line14: exclusion + 1 },
        {
          ...pending.form8815,
          line9_worksheet: {
            ...inputs.form8815.line9_worksheet,
            other_1040_and_schedule1_income: 1,
          },
        },
        { ...pending.form8815, eligible_students: [] },
        {
          ...pending.form8815,
          eligible_students: inputs.form8815.eligible_students.map((row, i) =>
            i === inputs.form8815.eligible_students.length - 1
              ? { ...row, institution_name: "" }
              : row
          ),
        },
      ]
    ) {
      const changed = { ...pending, form8815: replacement };
      await assertRejects(
        () => f1040_2025.prepareReturn(changed, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(changed, filer), Error);
    }
    if (kind !== "three") {
      await assertRejects(
        async () =>
          appendForm8815Institutions(
            await PDFDocument.create(),
            pending.form8815,
            undefined,
            pending,
          ),
        Error,
        "name and SSN",
      );
    }
  });
}
