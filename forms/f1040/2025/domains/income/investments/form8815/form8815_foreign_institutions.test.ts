import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { form8815Pdf } from "../../../../pdf/forms/income/investments/f8815.ts";
import { inputSchema } from "../../../../../nodes/intermediate/forms/income/investments/form8815/index.ts";
import {
  foreignInstitutionInputs,
  institutionCases,
} from "./form8815_foreign_institutions.fixture.ts";

for (const kind of institutionCases) {
  Deno.test(`Form 8815 foreign institution addresses and tax: ${kind}`, async () => {
    const inputs = foreignInstitutionInputs(kind);
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
    const students = inputs.form8815.eligible_students;
    assertEquals(
      (prepared.bundle.xml.match(/<EligibleInstitutionFrgnAddress>/g) ?? [])
        .length,
      students.filter((student) =>
        "country_code" in student.institution_address
      ).length,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<EligibleInstitutionUSAddress>/g) ?? [])
        .length,
      students.filter((student) => "state" in student.institution_address)
        .length,
    );
    assertStringIncludes(prepared.bundle.xml, "<CountryCd>GM</CountryCd>");
    assertStringIncludes(prepared.bundle.xml, "<ZIPCd>021081234</ZIPCd>");
    const projected = form8815Pdf.projectFields!(pending.form8815, pending);
    assertEquals(
      projected.student_1_address,
      "10 College Road, Toronto Ontario M5S 1A1, Canada",
    );
    assertEquals(
      projected.student_2_address,
      "20 College Street, Berlin 10115, Germany",
    );
    assertEquals(
      projected.student_3_address,
      "30 College Avenue, Boston, MA 02108-1234",
    );
    assertEquals(projected.student_4_address, undefined);
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
    const root = Deno.env.get("OPENTAX_FORM8815_FOREIGN_PROOF_DIR");
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
    const firstAddress = students[0].institution_address;
    for (
      const badAddress of [
        { ...firstAddress, country_code: "DE" },
        { ...firstAddress, country_code: "US" },
        { ...firstAddress, country_code: "ZZ" },
        { ...firstAddress, country_code: "" },
        { ...firstAddress, state: "MA", zip: "02108" },
        { ...firstAddress, line1: "" },
        { ...firstAddress, line1: "10 College St." },
        { ...firstAddress, line2: "W".repeat(36) },
        { ...firstAddress, city: "Bad  City" },
        { ...firstAddress, province_or_state: "W".repeat(18) },
        { ...firstAddress, postal_code: "W".repeat(17) },
        { ...students[2].institution_address, country_code: "CA" },
      ]
    ) {
      // Alter the final row too, so the continuation is validated alongside
      // the three rows on the canonical form.
      const source = {
        ...inputs.form8815,
        eligible_students: students.map((student, i) =>
          i === students.length - 1
            ? { ...student, institution_address: badAddress }
            : student
        ),
      };
      assertThrows(() => inputSchema.parse(source));
      const changed = {
        ...pending,
        form8815: { ...pending.form8815, ...source },
      };
      await assertRejects(
        () => f1040_2025.prepareReturn(changed, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(changed, filer), Error);
    }
  });
}
