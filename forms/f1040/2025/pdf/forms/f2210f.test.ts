import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm2210FBoxB } from "../../form2210f_box_b.ts";
import { form2210fPdf } from "./f2210f.ts";

function source() {
  return {
    gross_income_years: [
      {
        tax_year: 2024,
        total_gross_income: 100_000,
        farming_fishing_gross_income: 70_000,
        reviewed_source_reference: "2024-gross-income",
      },
      {
        tax_year: 2025,
        total_gross_income: 100_000,
        farming_fishing_gross_income: 0,
        reviewed_source_reference: "2025-gross-income",
      },
    ],
    prior_separate_returns: [
      {
        owner: "taxpayer",
        filing_status: "single",
        full_twelve_months: true,
        filed_return_reference: "2024-taxpayer",
        line22_tax_after_credits: 4_000,
        included_schedule2_taxes: 0,
        line4_refundable_credits_excluding_schedule3_line11: 0,
      },
      {
        owner: "spouse",
        filing_status: "head_of_household",
        full_twelve_months: true,
        filed_return_reference: "2024-spouse",
        line22_tax_after_credits: 5_000,
        included_schedule2_taxes: 0,
        line4_refundable_credits_excluding_schedule3_line11: 0,
      },
    ],
    current_return_reference: "2025-joint",
    current_filing_status: "married_filing_jointly",
    current_line22_tax_after_credits: 15_000,
    current_included_schedule2_taxes: 3_000,
    current_line4_refundable_credits_excluding_schedule3_line11: 1_000,
    current_withholding: 1_000,
    current_excess_social_security_or_rrta_withholding: 0,
    estimated_payments_by_2026_01_15: 1_000,
    full_underpayment_paid_on: "2026-03-01",
  };
}

Deno.test("Form 2210-F PDF omits an absent form", () => {
  assertEquals(form2210fPdf.projectFields?.({}, {}), {});
});

Deno.test("Form 2210-F PDF maps box B and printed line 14 date, leaving reserved line 5 blank", () => {
  const facts = source();
  const lines = calculateForm2210FBoxB(facts);
  const pending = {
    f1040: {
      line22_tax_after_credits: lines.line1,
      line23_other_taxes: lines.line2,
      line25d_total_withholding: lines.line8,
      line38_underpayment_penalty: lines.line16,
    },
  };
  const projected = form2210fPdf.projectFields?.(
    { source: facts, filed_lines: lines },
    pending,
  );
  assertEquals(projected?.line14_month, "03");
  assertEquals(projected?.line14_day, "01");
  assertEquals(projected?.line16, lines.line16);
  assertEquals(
    form2210fPdf.fields.some((field) =>
      field.pdfField === "topmostSubform[0].Page1[0].f1_7[0]"
    ),
    false,
  );
  assertEquals(
    form2210fPdf.fields.find((field) => field.domainKey === "box_b")?.pdfField,
    "topmostSubform[0].Page1[0].c1_2[0]",
  );
});

Deno.test("Form 2210-F PDF maps every printed amount to its canonical widget", () => {
  const widgets = new Map(form2210fPdf.fields.map((field) => [
    field.domainKey,
    field.pdfField,
  ]));
  const page = "topmostSubform[0].Page1[0]";
  const expected = [
    ["line1", 3],
    ["line2", 4],
    ["line3", 5],
    ["line4", 6],
    ["line6", 8],
    ["line7", 9],
    ["line8", 10],
    ["line9", 11],
    ["line10", 12],
    ["line11", 13],
    ["line12", 14],
    ["line13", 15],
    ["line14_month", 16],
    ["line14_day", 17],
    ["line15", 18],
    ["line16", 19],
  ] as const;
  for (const [line, widget] of expected) {
    assertEquals(widgets.get(line), `${page}.f1_${widget}[0]`);
  }
  assertEquals(widgets.size, expected.length + 1);
});

Deno.test("Form 2210-F PDF rejects changed 1040 tax and unsourced filed lines", () => {
  const facts = source();
  const lines = calculateForm2210FBoxB(facts);
  const pending = {
    f1040: {
      line22_tax_after_credits: lines.line1,
      line23_other_taxes: lines.line2,
      line25d_total_withholding: lines.line8,
      line38_underpayment_penalty: lines.line16,
    },
  };
  assertThrows(() =>
    form2210fPdf.projectFields?.(
      { source: facts, filed_lines: { ...lines, line16: lines.line16 + 1 } },
      pending,
    )
  );
  assertThrows(() =>
    form2210fPdf.projectFields?.(
      { source: facts, filed_lines: lines },
      {
        f1040: { ...pending.f1040, line38_underpayment_penalty: 0 },
      },
    )
  );
});
