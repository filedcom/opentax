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

Deno.test("Form 8962 PDF maps its calculated lines and monthly table to page 1", () => {
  assertEquals(
    mappedField(form8962Pdf, "federal_poverty_line"),
    "topmostSubform[0].Page1[0].f1_7[0]",
  );
  assertEquals(
    mappedField(form8962Pdf, "total_premium_tax_credit"),
    "topmostSubform[0].Page1[0].f1_91[0]",
  );
  assertEquals(
    mappedField(form8962Pdf, "pdf_net_premium_tax_credit"),
    "topmostSubform[0].Page1[0].f1_93[0]",
  );
  assertEquals(
    mappedField(form8962Pdf, "excess_advance_premium"),
    "topmostSubform[0].Page1[0].f1_96[0]",
  );
  assertEquals(
    mappedField(form8962Pdf, "pdf_month_1_premium"),
    "topmostSubform[0].Page1[0].Part2Table2[0].BodyRow1[0].f1_19[0]",
  );
  assertEquals(
    mappedField(form8962Pdf, "pdf_month_12_aptc"),
    "topmostSubform[0].Page1[0].Part2Table2[0].BodyRow12[0].f1_90[0]",
  );
});

Deno.test("Form 8962 PDF projects shared policy percentages without dollar rounding", () => {
  const allocation = {
    policy_number: "POLICY-1",
    other_taxpayer_ssn: "222334444",
    start_month: 1,
    end_month: 6,
    premium_pct: 0.67,
    slcsp_pct: 0.67,
    aptc_pct: 0.67,
  };
  const projected = form8962Pdf.projectFields?.({
    fpl_region: "contiguous",
    applicable_figure: 0.0200,
    monthly_ptc_rows: [{
      month_code: "JANUARY",
      premium: 804,
      slcsp: 1_005,
      contribution: 50,
      max_assistance: 955,
      allowed_credit: 804,
      aptc: 536,
    }],
    shared_policy_allocations: [allocation],
    total_premium_tax_credit: 804,
    total_advance_ptc: 536,
    net_premium_tax_credit: 268,
  }, {});
  assertEquals(projected?.pdf_applicable_figure, "0.0200");
  assertEquals(projected?.pdf_line9_yes, true);
  assertEquals(projected?.pdf_line10_no, true);
  assertEquals(projected?.pdf_line34_yes, true);
  assertEquals(projected?.pdf_month_1_aptc, "536");
  assertEquals(projected?.pdf_allocation_1_start_month, "01");
  assertEquals(projected?.pdf_allocation_1_premium_pct, "0.67");
  assertEquals(
    mappedField(form8962Pdf, "pdf_allocation_1_premium_pct"),
    "topmostSubform[0].Page2[0].Lines30e-g[0].f2_5[0]",
  );
});

Deno.test("Form 8962 PDF marks line 34 No for a fifth allocation row", () => {
  const projected = form8962Pdf.projectFields?.({
    monthly_ptc_rows: [],
    shared_policy_allocations: Array.from({ length: 5 }, (_, index) => ({
      policy_number: `POLICY-${index + 1}`,
      other_taxpayer_ssn: "222334444",
      start_month: index + 1,
      end_month: index + 1,
      premium_pct: 0.5,
    })),
  }, {});
  assertEquals(projected?.pdf_line34_yes, false);
  assertEquals(projected?.pdf_line34_no, true);
  assertEquals(projected?.pdf_allocation_4_policy_number, "POLICY-4");
  assertEquals(projected?.pdf_allocation_5_policy_number, undefined);
});
