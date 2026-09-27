import { assertEquals, assertThrows } from "@std/assert";
import { f8978, type Form8978Input, Form8978Source } from "./index.ts";
import { income_tax_calculation } from "../../intermediate/worksheets/income_tax_calculation/index.ts";

function filing(
  originalTaxLiability = 1_000,
  correctedIncomeTax = 1_500,
): Form8978Input["filings"][number] {
  return {
    source: Form8978Source.BbaAudit,
    columns: [{
      tax_year_end: "2022-12-31",
      original_income: 20_000,
      income_adjustments: [{ description: "Form 8986 income", amount: 2_000 }],
      original_deductions: 5_000,
      deduction_adjustments: [],
      corrected_income_tax: correctedIncomeTax,
      corrected_amt: 0,
      original_credits: 0,
      credit_adjustments: [],
      original_tax_liability: originalTaxLiability,
      tax_calculation_explanation:
        "Recomputed using the affected-year return and rules.",
    }],
  };
}

function compute(input: Parameters<typeof f8978.compute>[1]) {
  return f8978.compute({ taxYear: 2025, formType: "f1040" }, input);
}

Deno.test("f8978 routes the positive tax-liability difference to line 16 calculation", () => {
  const result = compute({ filings: [filing()] });
  const form = result.outputs.find((output) => output.nodeType === "f8978");
  const tax = result.outputs.find((output) =>
    output.nodeType === income_tax_calculation.nodeType
  );
  assertEquals(form?.fields.line14, 500);
  assertEquals(tax?.fields.form8978_tax, 500);
  assertEquals(
    result.outputs.some((output) => output.nodeType === "schedule2"),
    false,
  );
});

Deno.test("f8978 sums signed affected-year differences across filings", () => {
  const result = compute({ filings: [filing(), filing(1_200, 900)] });
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f8978")?.fields.line14,
    200,
  );
});

Deno.test("f8978 does not invent a tax rate from an adjustment amount", () => {
  const result = compute({ filings: [filing(1_500, 1_500)] });
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f8978")?.fields.line14,
    0,
  );
  assertEquals(
    result.outputs.some((output) =>
      output.nodeType === income_tax_calculation.nodeType
    ),
    false,
  );
});

Deno.test("f8978 sends negative line 14 to the reporting-year and AMT worksheets", () => {
  const result = compute({ filings: [filing(1_500, 1_000)] });
  assertEquals(
    result.outputs.find((output) =>
      output.nodeType === "form8978_reporting_year"
    )
      ?.fields.negative_form8978_line14,
    500,
  );
  assertEquals(
    result.outputs.find((output) => output.nodeType === "form6251")
      ?.fields.form8978_negative_line14,
    500,
  );
  assertEquals(
    result.outputs.some((output) =>
      output.nodeType === income_tax_calculation.nodeType
    ),
    false,
  );
});

Deno.test("f8978 requires source adjustment detail and a prior affected year", () => {
  const noRows = filing();
  noRows.columns[0].income_adjustments = [];
  assertThrows(
    () => compute({ filings: [noRows] }),
    Error,
    "Schedule A adjustment rows",
  );

  const currentYear = filing();
  currentYear.columns[0].tax_year_end = "2025-12-31";
  assertThrows(
    () => compute({ filings: [currentYear] }),
    Error,
    "precede the reporting year",
  );
});

Deno.test("f8978 schema limits each filing to four affected years", () => {
  const one = filing();
  assertEquals(
    f8978.inputSchema.safeParse({
      filings: [{ ...one, columns: Array(5).fill(one.columns[0]) }],
    }).success,
    false,
  );
});

Deno.test("f8978 uses explicitly recomputed taxable income and tax liability", () => {
  const adjusted = filing();
  adjusted.columns[0].corrected_taxable_income = 14_500;
  adjusted.columns[0].corrected_taxable_income_explanation =
    "A prior-year tax attribute changes line 5 beyond lines 2 less 4.";
  adjusted.columns[0].corrected_income_tax_liability = 1_650;
  adjusted.columns[0].corrected_income_tax_liability_explanation =
    "An affected-year liability adjustment not shown on lines 8 or 10 adds $150.";
  const result = compute({ filings: [adjusted] });
  const computed = result.outputs.find((output) => output.nodeType === "f8978")
    ?.fields.calculated_filings as Array<
      { years: Array<{ line5: number; line11: number }> }
    >;
  assertEquals(computed[0].years[0].line5, 14_500);
  assertEquals(computed[0].years[0].line11, 1_650);
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f8978")?.fields.line14,
    650,
  );
});

Deno.test("f8978 requires separate statements for nonarithmetic lines 5 and 11", () => {
  const adjusted = filing();
  adjusted.columns[0].corrected_taxable_income = 14_500;
  assertThrows(
    () => compute({ filings: [adjusted] }),
    Error,
    "line 5 adjustment needs its separate calculation statement",
  );
  adjusted.columns[0].corrected_taxable_income_explanation =
    "A prior-year tax attribute changes taxable income.";
  adjusted.columns[0].corrected_income_tax_liability = 1_650;
  assertThrows(
    () => compute({ filings: [adjusted] }),
    Error,
    "line 11 adjustment needs its separate calculation statement",
  );
  adjusted.columns[0].corrected_income_tax_liability_explanation =
    "A separate affected-year tax item changes liability.";
  assertEquals(
    compute({ filings: [adjusted] }).outputs.find((output) =>
      output.nodeType === "f8978"
    )?.fields.line14,
    650,
  );
});

Deno.test("f8978 requires explanations for penalties and interest", () => {
  const withPenalty = filing();
  withPenalty.columns[0].penalty = 10;
  assertEquals(
    f8978.inputSchema.safeParse({ filings: [withPenalty] }).success,
    false,
  );
  withPenalty.columns[0].penalty_calculation_explanation =
    "Affected-year penalty calculation.";
  withPenalty.columns[0].interest = 20;
  assertEquals(
    f8978.inputSchema.safeParse({ filings: [withPenalty] }).success,
    false,
  );
  withPenalty.columns[0].interest_calculation_explanation =
    "Affected-year interest calculation.";
  assertEquals(
    f8978.inputSchema.safeParse({ filings: [withPenalty] }).success,
    true,
  );
});

Deno.test("f8978 orders AAR forms before BBA audit forms", () => {
  const aar = filing();
  aar.source = Form8978Source.Aar;
  assertThrows(
    () => compute({ filings: [filing(), aar] }),
    Error,
    "AAR filings must precede BBA audit filings",
  );
  const result = compute({ filings: [aar, filing()] });
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f8978")?.fields.line14,
    1_000,
  );
});
