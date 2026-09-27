import { assertEquals } from "@std/assert";
import { form1116Pdf } from "./f1116.ts";
import {
  form1116,
  IncomeCategory,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";

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

Deno.test("Form 1116 PDF line 18 source is the computed senior-adjusted amount", () => {
  const result = form1116.compute({ taxYear: 2025, formType: "f1040" }, {
    foreign_tax_items: [{
      foreign_tax_paid: 500,
      foreign_gross_income: 5_000,
      income_category: IncomeCategory.Passive,
    }],
    worldwide_taxable_income: 40_000,
    enhanced_senior_deduction: 6_000,
    us_tax_before_credits: 4_000,
  });
  const fields = result.outputs.find((item) => item.nodeType === "form_1116")
    ?.fields;
  assertEquals(fields?.total_income, 46_000);
  assertEquals(fields?.us_tax_before_credits, 4_000);
  assertEquals(
    form1116Pdf.fields.find((field) => field.domainKey === "total_income")
      ?.pdfField,
    "topmostSubform[0].Page2[0].f2_10[0]",
  );
});
