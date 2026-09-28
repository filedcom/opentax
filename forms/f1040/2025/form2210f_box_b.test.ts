import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm2210FBoxB } from "./form2210f_box_b.ts";

function sourcedBoxB() {
  return {
    gross_income_years: [
      {
        tax_year: 2024 as const,
        total_gross_income: 100_000,
        farming_fishing_gross_income: 70_000,
        reviewed_source_reference: "filed-2024-gross-income-workpaper",
      },
      {
        tax_year: 2025 as const,
        total_gross_income: 90_000,
        farming_fishing_gross_income: 0,
        reviewed_source_reference: "2025-gross-income-workpaper",
      },
    ] as const,
    prior_separate_returns: [
      {
        owner: "taxpayer" as const,
        filing_status: "single" as const,
        full_twelve_months: true as const,
        filed_return_reference: "filed-2024-taxpayer",
        line22_tax_after_credits: 4_000,
        included_schedule2_taxes: 0,
        line4_refundable_credits_excluding_schedule3_line11: 0,
      },
      {
        owner: "spouse" as const,
        filing_status: "head_of_household" as const,
        full_twelve_months: true as const,
        filed_return_reference: "filed-2024-spouse",
        line22_tax_after_credits: 5_000,
        included_schedule2_taxes: 0,
        line4_refundable_credits_excluding_schedule3_line11: 0,
      },
    ] as const,
    current_return_reference: "finalized-2025-joint",
    current_filing_status: "married_filing_jointly" as const,
    current_line22_tax_after_credits: 15_000,
    current_included_schedule2_taxes: 3_000,
    current_line4_refundable_credits_excluding_schedule3_line11: 1_000,
    current_withholding: 1_000,
    current_excess_social_security_or_rrta_withholding: 0,
    estimated_payments_by_2026_01_15: 1_000,
    full_underpayment_paid_on: null,
  };
}

Deno.test("Form 2210-F box B calculates a sourced two-return changed-joint-status underpayment", () => {
  const lines = calculateForm2210FBoxB(sourcedBoxB());
  assertEquals(lines.box_b, true);
  assertEquals(lines.line3, 18_000);
  assertEquals(lines.line6, 17_000);
  assertEquals(lines.line7, 11_339);
  assertEquals(lines.line10, 9_000);
  assertEquals(lines.line11, 9_000);
  assertEquals(lines.line12, 2_000);
  assertEquals(lines.line13, 7_000);
  assertEquals(lines.line14, "2026-04-15");
  assertEquals(lines.line15, 90);
  assertEquals(lines.line16, 121);
});

Deno.test("Form 2210-F box B uses full-payment date for one complete settlement", () => {
  const lines = calculateForm2210FBoxB({
    ...sourcedBoxB(),
    full_underpayment_paid_on: "2026-02-14",
  });
  assertEquals(lines.line15, 30);
  assertEquals(lines.line16, 40);
});

Deno.test("Form 2210-F box B still attaches when withholding clears the required payment", () => {
  const lines = calculateForm2210FBoxB({
    ...sourcedBoxB(),
    current_withholding: 8_000,
  });
  assertEquals(lines.line13, 0);
  assertEquals(lines.line14, null);
  assertEquals(lines.line16, 0);
});

Deno.test("Form 2210-F box B rejects unproven farmer status and duplicate prior returns", () => {
  const source = sourcedBoxB();
  assertThrows(() => calculateForm2210FBoxB({
    ...source,
    gross_income_years: [
      { ...source.gross_income_years[0], farming_fishing_gross_income: 60_000 },
      source.gross_income_years[1],
    ],
  }));
  assertThrows(() => calculateForm2210FBoxB({
    ...source,
    prior_separate_returns: [
      source.prior_separate_returns[0],
      {
        ...source.prior_separate_returns[1],
        filed_return_reference: "filed-2024-taxpayer",
      },
    ],
  }));
});

Deno.test("Form 2210-F box B rejects when its filing reason or settlement is absent", () => {
  const source = sourcedBoxB();
  assertThrows(() => calculateForm2210FBoxB({
    ...source,
    prior_separate_returns: [
      { ...source.prior_separate_returns[0], line22_tax_after_credits: 20_000 },
      source.prior_separate_returns[1],
    ],
  }));
  assertThrows(() => calculateForm2210FBoxB({
    ...source,
    full_underpayment_paid_on: "2026-02-30",
  }));
  assertThrows(() => calculateForm2210FBoxB({
    ...source,
    full_underpayment_paid_on: "2026-01-15",
  }));
});
