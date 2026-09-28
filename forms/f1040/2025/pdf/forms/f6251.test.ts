import { assertEquals, assertThrows } from "@std/assert";
import { form6251Pdf } from "./f6251.ts";

Deno.test("Form 6251 PDF maps signed estate/trust adjustment to line 2j", () => {
  assertEquals(
    form6251Pdf.fields.find((field) =>
      field.domainKey === "line2j_estates_and_trusts"
    )?.pdfField,
    "topmostSubform[0].Page1[0].f1_14[0]",
  );
});

Deno.test("Form 6251 PDF maps signed Form 8949 basis difference to line 2k", () => {
  assertEquals(
    form6251Pdf.fields.find((field) => field.domainKey === "line2k_disposition")
      ?.pdfField,
    "topmostSubform[0].Page1[0].f1_15[0]",
  );
});

Deno.test("Form 6251 PDF maps the positive refund to line 2b's parenthetical field", () => {
  assertEquals(
    form6251Pdf.fields.find((field) => field.domainKey === "line2b_tax_refund")
      ?.pdfField,
    "topmostSubform[0].Page1[0].f1_6[0]",
  );
});

Deno.test("Form 6251 PDF maps signed depletion to line 2d", () => {
  assertEquals(
    form6251Pdf.fields.find((field) => field.domainKey === "line2d_depletion")
      ?.pdfField,
    "topmostSubform[0].Page1[0].f1_8[0]",
  );
});

Deno.test("Form 6251 PDF maps signed circulation costs to line 2o", () => {
  assertEquals(
    form6251Pdf.fields.find((field) =>
      field.domainKey === "line2o_circulation_costs"
    )?.pdfField,
    "topmostSubform[0].Page1[0].f1_19[0]",
  );
});

Deno.test("Form 6251 PDF rejects mixed adjustments instead of labeling them line 3", () => {
  assertEquals(
    form6251Pdf.fields.some((field) => field.domainKey === "other_adjustments"),
    false,
  );
  for (const adjustment of [-1000, 1000]) {
    assertThrows(
      () => form6251Pdf.projectFields?.({ other_adjustments: adjustment }, {}),
      Error,
      "mixed other_adjustments needs line-specific AMT modeling",
    );
  }
});

Deno.test("Form 6251 PDF maps signed line 1b, Part II, Part III, and filer header to verified widgets", () => {
  const mapped = (key: string) =>
    form6251Pdf.fields.find((field) => field.domainKey === key)?.pdfField;
  assertEquals(
    mapped("regular_tax_income"),
    "topmostSubform[0].Page1[0].f1_4[0]",
  );
  assertEquals(mapped("nol_adjustment"), "topmostSubform[0].Page1[0].f1_10[0]");
  assertEquals(mapped("amti"), "topmostSubform[0].Page1[0].f1_26[0]");
  assertEquals(mapped("line11_amt"), "topmostSubform[0].Page1[0].f1_33[0]");
  assertEquals(mapped("line12"), "topmostSubform[0].Page2[0].f2_1[0]");
  assertEquals(mapped("line40"), "topmostSubform[0].Page2[0].f2_29[0]");
  assertEquals(
    form6251Pdf.filerFields?.[0]?.pdfField,
    "topmostSubform[0].Page1[0].f1_1[0]",
  );
  assertEquals(
    form6251Pdf.filerFields?.[1]?.pdfField,
    "topmostSubform[0].Page1[0].f1_2[0]",
  );
});

Deno.test("Form 6251 PDF derives line 1a and rejects unsourced ATNOLD", () => {
  const projected = form6251Pdf.projectFields?.(
    { regular_tax_income: 86_000 },
    {
      f1040: { line11_agi: 100_000, line14_deductions_qbi_total: 20_000 },
      schedule1a: { line37_senior: 6_000 },
    },
  );
  assertEquals(projected?.line1a_less_senior_deduction, 14_000);
  for (const adjustment of [-10_000, 10_000]) {
    assertThrows(
      () =>
        form6251Pdf.projectFields?.(
          { regular_tax_income: 86_000, nol_adjustment: adjustment },
          {
            f1040: { line11_agi: 100_000, line14_deductions_qbi_total: 20_000 },
            schedule1a: { line37_senior: 6_000 },
          },
        ),
      Error,
      "sourced regular NOL and AMT NOL refigures",
    );
  }
});

Deno.test("Form 6251 PDF rejects missing or contradictory Form 1040 line 1a source", () => {
  assertThrows(
    () => form6251Pdf.projectFields?.({ regular_tax_income: 86_000 }, {}),
    Error,
    "needs finalized Form 1040",
  );
  assertThrows(
    () =>
      form6251Pdf.projectFields?.(
        { regular_tax_income: 85_000 },
        {
          f1040: { line11_agi: 100_000, line14_deductions_qbi_total: 20_000 },
          schedule1a: { line37_senior: 6_000 },
        },
      ),
    Error,
    "does not reconcile",
  );
});

Deno.test("Form 6251 PDF includes negative-adjustment who-must-file case", () => {
  assertEquals(
    form6251Pdf.includeWhen?.({
      tentative_tax: 0,
      regular_tax: 2_000,
      line11_amt: 0,
      must_file_for_negative_adjustments: true,
    }),
    true,
  );
  assertEquals(
    form6251Pdf.includeWhen?.({
      tentative_tax: 0,
      regular_tax: 2_000,
      line11_amt: 0,
    }),
    false,
  );
});

Deno.test("Form 6251 PDF keeps the domestic preferential zero-AMT filing case", () => {
  assertEquals(
    form6251Pdf.includeWhen?.({
      qualified_dividends: 1_000,
      line2c_investment_interest: -20_000,
      tentative_tax: 0,
      regular_tax: 2_000,
      line11_amt: 0,
      must_file_for_negative_adjustments: true,
    }),
    true,
  );
});

Deno.test("Form 6251 PDF rejects a contradictory line 9 when line 8 is blank", () => {
  assertThrows(
    () =>
      form6251Pdf.projectFields?.({
        tentative_tax: 29_094,
        regular_tax: 30_000,
        net_tmt: 24_094,
        must_file_for_credit: true,
      }, {}),
    Error,
    "line 9 must equal line 7",
  );
});
