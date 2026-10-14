import { assertEquals, assertThrows } from "@std/assert";
import { form8834Pdf } from "./f8834.ts";

const fields = {
  f8834s: [{
    source_form: "8582-CR" as const,
    source_activity_id: "rental-a",
    allowed_passive_activity_credit: 600,
  }],
  line1_source_credit: 600,
  line2_regular_tax: 1_000,
  line3a_foreign_tax_credit: 100,
  line3b_other_credits: 150,
  line3c_total_credits: 250,
  line4_net_regular_tax: 750,
  line5_tentative_minimum_tax: 300,
  line6_adjusted_regular_tax: 450,
  line7_allowed_credit: 450,
};

Deno.test("Form 8834 PDF maps all nine credit lines and omits the instructions page", () => {
  assertEquals(form8834Pdf.pageIndices?.(fields), [0]);
  const names = Object.fromEntries(
    form8834Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(names.line1_source_credit, "topmostSubform[0].Page1[0].f1_3[0]");
  assertEquals(
    names.line3b_other_credits,
    "topmostSubform[0].Page1[0].f1_6[0]",
  );
  assertEquals(
    names.line7_allowed_credit,
    "topmostSubform[0].Page1[0].f1_11[0]",
  );
});

Deno.test("Form 8834 PDF requires source and Schedule 3 reconciliation", () => {
  assertEquals(
    form8834Pdf.projectFields?.(fields, {
      schedule3: { line6i_qualified_electric_vehicle_credit: 450 },
    })?.line7_allowed_credit,
    450,
  );
  assertThrows(
    () =>
      form8834Pdf.projectFields?.({
        ...fields,
        line6_adjusted_regular_tax: 500,
      }, {
        schedule3: { line6i_qualified_electric_vehicle_credit: 450 },
      }),
    Error,
    "does not reconcile",
  );
});
