import { assert, assertEquals, assertThrows } from "@std/assert";
import { buildForm2210FBoxB, form2210f } from "./f2210f_box_b.ts";
import {
  calculateForm2210FBoxB,
  form2210FBoxBInputSchema,
} from "../../form2210f_box_b.ts";

function source() {
  return form2210FBoxBInputSchema.parse({
    gross_income_years: [
      {
        tax_year: 2024,
        total_gross_income: 100_000,
        farming_fishing_gross_income: 70_000,
        reviewed_source_reference: "gross-2024",
      },
      {
        tax_year: 2025,
        total_gross_income: 100_000,
        farming_fishing_gross_income: 0,
        reviewed_source_reference: "gross-2025",
      },
    ],
    prior_separate_returns: [
      {
        owner: "taxpayer",
        filing_status: "single",
        full_twelve_months: true,
        filed_return_reference: "taxpayer-2024",
        line22_tax_after_credits: 4_000,
        included_schedule2_taxes: 0,
        line4_refundable_credits_excluding_schedule3_line11: 0,
      },
      {
        owner: "spouse",
        filing_status: "head_of_household",
        full_twelve_months: true,
        filed_return_reference: "spouse-2024",
        line22_tax_after_credits: 5_000,
        included_schedule2_taxes: 0,
        line4_refundable_credits_excluding_schedule3_line11: 0,
      },
    ],
    current_return_reference: "joint-2025",
    current_filing_status: "married_filing_jointly",
    current_line22_tax_after_credits: 15_000,
    current_included_schedule2_taxes: 3_000,
    current_line4_refundable_credits_excluding_schedule3_line11: 1_000,
    current_withholding: 1_000,
    current_excess_social_security_or_rrta_withholding: 0,
    estimated_payments_by_2026_01_15: 1_000,
    full_underpayment_paid_on: null,
  });
}

Deno.test("Form 2210-F box B local XML follows TY2025 element order and amounts", () => {
  const xml = buildForm2210FBoxB(source());
  assert(xml.startsWith("<IRS2210F>"));
  assert(xml.includes("<JointReturnInd>X</JointReturnInd>"));
  assert(
    xml.includes(
      "<CurrentYearTaxCalculatedAmt>11339</CurrentYearTaxCalculatedAmt>",
    ),
  );
  assert(xml.includes("<PriorYearTaxAmt>9000</PriorYearTaxAmt>"));
  assert(xml.includes("<PenaltyDayCnt>90</PenaltyDayCnt>"));
  assert(xml.includes("<PenaltyAmt>121</PenaltyAmt>"));
  assertEquals(xml.indexOf("<JointReturnInd>"), xml.indexOf("<IRS2210F>") + 10);
});

Deno.test("Form 2210-F box B local XML omits Part III when no penalty is due", () => {
  const xml = buildForm2210FBoxB({ ...source(), current_withholding: 8_000 });
  assert(xml.includes("<UnderpaymentAmt>0</UnderpaymentAmt>"));
  assert(!xml.includes("<PenaltyAmt>"));
  assert(!xml.includes("<EarlierOfPaymentOrTaxDueDt>"));
});

Deno.test("Form 2210-F box B local XML rejects unsourced eligibility", () => {
  const input = source();
  assertThrows(() =>
    buildForm2210FBoxB({
      ...input,
      gross_income_years: [
        {
          ...input.gross_income_years[0],
          farming_fishing_gross_income: 10_000,
        },
        input.gross_income_years[1],
      ],
    })
  );
});

Deno.test("registered Form 2210-F checks finalized 1040 and filed worksheet", () => {
  const zeroTaxSource = {
    ...source(),
    current_included_schedule2_taxes: 0,
    current_line4_refundable_credits_excluding_schedule3_line11: 0,
    estimated_payments_by_2026_01_15: 0,
  };
  const lines = calculateForm2210FBoxB(zeroTaxSource);
  const fields = { source: zeroTaxSource, filed_lines: lines };
  const context = {
    pending: {
      f1040: {
        line22_tax_after_credits: 15_000,
        line23_other_taxes: 0,
        line25d_total_withholding: 1_000,
        line38_underpayment_penalty: lines.line16,
      },
    },
  };
  assert(form2210f.build(fields, context).includes("<IRS2210F>"));
  assertThrows(() =>
    form2210f.build(fields, {
      pending: {
        f1040: { ...context.pending.f1040, line38_underpayment_penalty: 1 },
      },
    })
  );
  assertThrows(() =>
    form2210f.build(fields, {
      pending: { ...context.pending, f2210: { underpayment_penalty: 1 } },
    })
  );
});
