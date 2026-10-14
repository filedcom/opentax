import { assertEquals, assertThrows } from "@std/assert";
import { form8859Pdf } from "./f8859.ts";

const fields = {
  f8859s: [{ carryforward_amount: 1_200 }],
  line1_carryforward: 1_200,
  line2_limit: 830,
  line3_allowed_credit: 830,
  line4_carryforward: 370,
  worksheet_line1_tax: 1_000,
  worksheet_line2_credits: 170,
};

Deno.test("Form 8859 PDF maps lines 1-4 and all three limit worksheet entries", () => {
  const names = Object.fromEntries(
    form8859Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(names.line1_carryforward, "topmostSubform[0].Page1[0].f1_3[0]");
  assertEquals(names.line4_carryforward, "topmostSubform[0].Page1[0].f1_6[0]");
  assertEquals(
    names.worksheet_line1_tax,
    "topmostSubform[0].Page1[0].Col1[0].Line1[0].f1_7[0]",
  );
  assertEquals(
    names.worksheet_line2_credits,
    "topmostSubform[0].Page1[0].Col2[0].Line2[0].f1_8[0]",
  );
  const line2 = form8859Pdf.fields.find((field) =>
    field.domainKey === "line2_limit"
  );
  assertEquals(
    line2 && "extraPdfFields" in line2 ? line2.extraPdfFields : undefined,
    [
      "topmostSubform[0].Page1[0].Col2[0].Line3[0].f1_9[0]",
    ],
  );
});

Deno.test("Form 8859 PDF requires the printed worksheet and Schedule 3 to reconcile", () => {
  assertEquals(
    form8859Pdf.projectFields?.(fields, {
      schedule3: { line6h_dc_homebuyer_credit: 830 },
    })?.line3_allowed_credit,
    830,
  );
  assertThrows(
    () =>
      form8859Pdf.projectFields?.({
        ...fields,
        worksheet_line2_credits: 200,
      }, {
        schedule3: { line6h_dc_homebuyer_credit: 830 },
      }),
    Error,
    "does not reconcile",
  );
});
