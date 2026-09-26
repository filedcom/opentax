import { assertEquals } from "@std/assert";
import type { PdfFormDescriptor } from "../form-descriptor.ts";
import { form8959Pdf } from "./f8959.ts";
import { form8960Pdf } from "./f8960.ts";
import { form6251Pdf } from "./f6251.ts";
import { form8962Pdf } from "./f8962.ts";
import { schedule2Pdf } from "./schedule2.ts";

function mappedField(
  descriptor: PdfFormDescriptor,
  domainKey: string,
): string | undefined {
  return descriptor.fields.find((entry) => entry.domainKey === domainKey)
    ?.pdfField;
}

Deno.test("Form 8959 maps resolved box 5 wages and computed totals to lines 1 through 24", () => {
  assertEquals(
    mappedField(form8959Pdf, "line1_medicare_wages"),
    "topmostSubform[0].Page1[0].f1_3[0]",
  );
  assertEquals(
    mappedField(form8959Pdf, "line7_wage_tax"),
    "topmostSubform[0].Page1[0].f1_9[0]",
  );
  assertEquals(
    mappedField(form8959Pdf, "line18_total_tax"),
    "topmostSubform[0].Page1[0].f1_20[0]",
  );
  assertEquals(
    mappedField(form8959Pdf, "line24_total_withheld"),
    "topmostSubform[0].Page1[0].f1_26[0]",
  );
});

Deno.test("Schedule 2 maps Additional Medicare Tax and NIIT to 2025 lines 11 and 12", () => {
  assertEquals(
    mappedField(schedule2Pdf, "line11_additional_medicare"),
    "form1[0].Page1[0].f1_22[0]",
  );
  assertEquals(
    mappedField(schedule2Pdf, "line12_niit"),
    "form1[0].Page1[0].f1_23[0]",
  );
});

Deno.test("Form 8960 maps computed NIIT through line 17", () => {
  assertEquals(
    mappedField(form8960Pdf, "line12_net_investment_income"),
    "topmostSubform[0].Page1[0].f1_22[0]",
  );
  assertEquals(
    mappedField(form8960Pdf, "line17_niit"),
    "topmostSubform[0].Page1[0].f1_27[0]",
  );
});

Deno.test("Form 6251 maps the AMT investment-interest difference to line 2c", () => {
  assertEquals(
    mappedField(form6251Pdf, "line2c_investment_interest"),
    "topmostSubform[0].Page1[0].f1_4[0]",
  );
});

Deno.test("Form 8962 PDF includes APTC-only monthly repayment", () => {
  assertEquals(
    form8962Pdf.includeWhen?.({
      monthly_ptc_rows: [{ month_code: "JANUARY", aptc: 200 }],
      total_advance_ptc: 200,
    }),
    true,
  );
  assertEquals(
    form8962Pdf.includeWhen?.({ household_income: 10_000 }),
    false,
  );
});

Deno.test("Form 8962 PDF maps MFS exception certification to line A", () => {
  assertEquals(
    mappedField(form8962Pdf, "mfs_exception_ind"),
    "topmostSubform[0].Page1[0].c1_1[0]",
  );
});
