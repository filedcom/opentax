import { assertEquals, assertThrows } from "@std/assert";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";
import { form2441Pdf } from "./f2441.ts";

const source = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-form2441-child-care-credit"
)!.inputs.form2441 as Record<string, unknown>;
const pending = {
  f1040: { line11_agi: 50_000 },
  schedule3: { line2_childcare_credit: 500 },
};

Deno.test("Form 2441 PDF prints sourced care rows and the limited credit", () => {
  const fields = form2441Pdf.projectFields!(source, pending);
  assertEquals(form2441Pdf.includeWhen!(fields, pending), true);
  assertEquals(form2441Pdf.pageIndices!(fields), [0]);
  assertEquals(fields.provider_0_name, "Care Center");
  assertEquals(fields.person_0_first, "Ada");
  assertEquals(fields.line8_rate, "20");
  assertEquals(fields.line11, 500);
  assertEquals(
    form2441Pdf.fields.find((field) => field.domainKey === "provider_0_name")
      ?.pdfField,
    "topmostSubform[0].Page1[0].PartITable[0].BodyRow1[0].f1_3[0]",
  );
});

Deno.test("Form 2441 PDF holds benefit and credit-mismatch claims", () => {
  assertThrows(
    () =>
      form2441Pdf.projectFields!(
        { ...source, dep_care_benefits: 500 },
        pending,
      ),
    Error,
    "benefits need Part III",
  );
  assertThrows(
    () =>
      form2441Pdf.projectFields!(source, {
        ...pending,
        schedule3: { line2_childcare_credit: 400 },
      }),
    Error,
    "differs from Schedule 3",
  );
});
