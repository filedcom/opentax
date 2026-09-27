import { assertEquals } from "@std/assert";
import { form1116Pdf } from "./f1116.ts";

Deno.test("Form 1116 PDF maps worldwide taxable income to 2025 line 18", () => {
  const entry = form1116Pdf.fields.find((field) =>
    field.domainKey === "total_income"
  );
  assertEquals(entry?.pdfField, "topmostSubform[0].Page2[0].f2_10[0]");
});

Deno.test("Form 1116 PDF maps U.S. tax before credits to 2025 line 20", () => {
  const entry = form1116Pdf.fields.find((field) =>
    field.domainKey === "us_tax_before_credits"
  );
  assertEquals(entry?.pdfField, "topmostSubform[0].Page2[0].f2_12[0]");
});
