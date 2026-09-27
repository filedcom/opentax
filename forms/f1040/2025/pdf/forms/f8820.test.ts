import { assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { form8820Pdf } from "./f8820.ts";

const drug = {
  generic_name: "Test Orphan Drug",
  designation_application_number: "FDA-123",
  designation_date: "2024-03-15",
  qualified_clinical_testing_expenses: 100_000,
  qualifying_testing_confirmed: true,
  expenses_exclude_third_party_funding: true,
  expenses_not_used_for_research_credit: true,
};
const source = {
  f8820s: [drug],
  reduced_section280c_credit_election: true,
  form8932_overlapping_wage_credit: 1_250,
  subject_to_passive_activity_limit: false,
};

Deno.test("Form 8820 PDF maps official Part I and Part II widgets", () => {
  const fields = Object.fromEntries(
    form8820Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(fields.line1, "topmostSubform[0].Page1[0].f1_3[0]");
  assertEquals(fields.line2a, "topmostSubform[0].Page1[0].f1_5[0]");
  assertEquals(fields.line2b, "topmostSubform[0].Page1[0].f1_7[0]");
  assertEquals(fields.line2c, "topmostSubform[0].Page1[0].f1_9[0]");
  assertEquals(fields.line4, "topmostSubform[0].Page1[0].f1_13[0]");
  assertEquals(
    fields.drug_1_name,
    "topmostSubform[0].Page2[0].Table_Part2[0].Row7a[0].f2_1[0]",
  );
  assertEquals(
    fields.drug_26_date,
    "topmostSubform[0].Page2[0].Table_Part2[0].Row7z[0].f2_78[0]",
  );
  assertEquals(form8820Pdf.pageIndices?.({}), [0, 1]);
});

Deno.test("Form 8820 PDF projects its credit and checks Form 3800", () => {
  const projected = form8820Pdf.projectFields?.(source, {
    f3800: { f8820_credit: { credit_amount: 18_500 } },
  }) ?? {};
  assertEquals(projected.line1, 100_000);
  assertEquals(projected.line2a, 19_750);
  assertEquals(projected.line2b, 1_250);
  assertEquals(projected.line2c, 18_500);
  assertEquals(projected.line4, 18_500);
  assertEquals(projected.drug_1_name, "Test Orphan Drug");
  assertEquals(projected.drug_1_designation, "FDA-123");
  assertEquals(projected.drug_1_date, "03/15/2024");
  assertEquals(form8820Pdf.includeWhen?.(projected), true);
  assertThrows(
    () => form8820Pdf.projectFields?.(source, { f3800: {} }),
    Error,
    "does not reconcile",
  );
});

Deno.test("Form 8820 PDF includes a zero-credit reduced election", () => {
  const election = {
    ...source,
    f8820s: [{ ...drug, qualified_clinical_testing_expenses: 0 }],
    form8932_overlapping_wage_credit: 0,
  };
  const projected = form8820Pdf.projectFields?.(election, {}) ?? {};
  assertEquals(projected.line4, 0);
  assertEquals(projected.drug_1_name, undefined);
  assertEquals(form8820Pdf.includeWhen?.(projected), true);
  assertEquals(
    form8820Pdf.includeWhen?.({
      ...election,
      reduced_section280c_credit_election: false,
    }),
    false,
  );
});

Deno.test("Form 8820 PDF compacts active drugs and appends Part II overflow", async () => {
  const many = {
    ...source,
    form8932_overlapping_wage_credit: 0,
    f8820s: [
      { ...drug, qualified_clinical_testing_expenses: 0 },
      ...Array.from({ length: 27 }, (_, index) => ({
        ...drug,
        generic_name: `Drug ${index + 1}`,
        designation_application_number: `FDA-${index + 1}`,
      })),
    ],
  };
  const projected = form8820Pdf.projectFields?.(many, {
    f3800: { f8820_credit: { credit_amount: 533_250 } },
  }) ?? {};
  assertEquals(projected.drug_1_name, "Drug 1");
  assertEquals(projected.drug_26_name, "Drug 26");
  const document = await PDFDocument.create();
  await form8820Pdf.appendSupplementalPages?.(document, projected, undefined);
  assertEquals(document.getPageCount(), 1);
});
