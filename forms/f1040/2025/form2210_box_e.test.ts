import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm2210BoxEPage1,
  type Form2210BoxEInput,
} from "./form2210_box_e.ts";

function source(): Form2210BoxEInput {
  return {
    current_filing_status: "married_filing_jointly",
    current_return_reference: "2025 finalized Form 1040",
    current_line22_tax_after_credits: 10_000,
    current_withholding_taxes: 2_000,
    current_included_other_taxes: 0,
    current_included_refundable_credits: 0,
    current_schedule3_line11_withholding: 0,
    current_section965_exclusion: 0,
    prior_separate_returns: [
      {
        owner: "taxpayer",
        tax_year: 2024,
        filing_status: "married_filing_separately",
        full_twelve_months: true,
        filed_return_reference: "2024 taxpayer filed Form 1040",
        filed_return_sha256: "a".repeat(64),
        adjusted_gross_income: 55_000,
        line22_tax_after_credits: 3_000,
        included_other_taxes: 0,
        included_refundable_credits: 0,
      },
      {
        owner: "spouse",
        tax_year: 2024,
        filing_status: "married_filing_separately",
        full_twelve_months: true,
        filed_return_reference: "2024 spouse filed Form 1040",
        filed_return_sha256: "b".repeat(64),
        adjusted_gross_income: 45_000,
        line22_tax_after_credits: 2_000,
        included_other_taxes: 0,
        included_refundable_credits: 0,
      },
    ],
  };
}

Deno.test("Form 2210 box E staged page 1 calculates lines 1-9 from two prior separate returns", () => {
  assertEquals(calculateForm2210BoxEPage1(source()), {
    box_e: true,
    line1: 10_000,
    line2: 0,
    line3: 0,
    line4: 10_000,
    line5: 9_000,
    line6: 2_000,
    line7: 8_000,
    line8: 5_000,
    line9: 5_000,
  });
});

Deno.test("Form 2210 box E still needs page 1 when withholding exceeds line 9", () => {
  const lines = calculateForm2210BoxEPage1({
    ...source(),
    current_withholding_taxes: 6_000,
  });
  assertEquals(lines.line7, 4_000);
  assertEquals(lines.line9, 5_000);
});

Deno.test("Form 2210 box E rejects duplicate prior-return evidence and 110% branch", () => {
  const input = source();
  assertThrows(() =>
    calculateForm2210BoxEPage1({
      ...input,
      prior_separate_returns: [
        input.prior_separate_returns[0],
        {
          ...input.prior_separate_returns[1],
          filed_return_sha256:
            input.prior_separate_returns[0].filed_return_sha256,
        },
      ],
    })
  );
  assertThrows(() =>
    calculateForm2210BoxEPage1({
      ...input,
      prior_separate_returns: [
        { ...input.prior_separate_returns[0], adjusted_gross_income: 75_001 },
        input.prior_separate_returns[1],
      ],
    })
  );
});

Deno.test("Form 2210 box E rejects cases not requiring a page-1 attachment", () => {
  const input = source();
  assertThrows(() =>
    calculateForm2210BoxEPage1({
      ...input,
      current_line22_tax_after_credits: 900,
    })
  );
  assertThrows(() =>
    calculateForm2210BoxEPage1({
      ...input,
      current_withholding_taxes: 9_500,
    })
  );
  assertThrows(() =>
    calculateForm2210BoxEPage1({
      ...input,
      prior_separate_returns: [
        { ...input.prior_separate_returns[0], line22_tax_after_credits: 8_000 },
        input.prior_separate_returns[1],
      ],
    })
  );
});
