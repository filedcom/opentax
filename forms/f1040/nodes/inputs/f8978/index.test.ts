import { assertEquals, assertThrows } from "@std/assert";
import { f8978, Form8978Source } from "./index.ts";
import { income_tax_calculation } from "../../intermediate/worksheets/income_tax_calculation/index.ts";

function filing(originalTaxLiability = 1_000, correctedIncomeTax = 1_500) {
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
      tax_calculation_explanation: "Recomputed using the affected-year return and rules.",
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
  assertEquals(result.outputs.some((output) => output.nodeType === "schedule2"), false);
});

Deno.test("f8978 sums signed affected-year differences across filings", () => {
  const result = compute({ filings: [filing(), filing(1_200, 900)] });
  assertEquals(result.outputs.find((output) => output.nodeType === "f8978")?.fields.line14, 200);
});

Deno.test("f8978 does not invent a tax rate from an adjustment amount", () => {
  const result = compute({ filings: [filing(1_500, 1_500)] });
  assertEquals(result.outputs.find((output) => output.nodeType === "f8978")?.fields.line14, 0);
  assertEquals(result.outputs.some((output) =>
    output.nodeType === income_tax_calculation.nodeType
  ), false);
});

Deno.test("f8978 rejects negative line 14 until the limitation worksheets exist", () => {
  assertThrows(
    () => compute({ filings: [filing(1_500, 1_000)] }),
    Error,
    "Schedule 3 line 6l and Schedule 2 line 17z limitation worksheets",
  );
});

Deno.test("f8978 requires source adjustment detail and a prior affected year", () => {
  const noRows = filing();
  noRows.columns[0].income_adjustments = [];
  assertThrows(() => compute({ filings: [noRows] }), Error, "Schedule A adjustment rows");

  const currentYear = filing();
  currentYear.columns[0].tax_year_end = "2025-12-31";
  assertThrows(() => compute({ filings: [currentYear] }), Error, "precede the reporting year");
});

Deno.test("f8978 schema limits each filing to four affected years", () => {
  const one = filing();
  assertEquals(f8978.inputSchema.safeParse({
    filings: [{ ...one, columns: Array(5).fill(one.columns[0]) }],
  }).success, false);
});
