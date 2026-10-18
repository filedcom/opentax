import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { income_tax_calculation, inputSchema } from "./index.ts";
import { f1040 } from "../../../../../outputs/general/return-assembly/f1040/index.ts";
import { fieldsOf } from "../../../../../../../../core/test-utils/output.ts";
import { FilingStatus } from "../../../../../types.ts";
import { rate24BracketCeiling } from "../year_schedule.ts";

function tax2026(input: Record<string, unknown>): number | undefined {
  const result = income_tax_calculation.compute(
    { taxYear: 2026, formType: "f1040" },
    inputSchema.parse({
      form6251_line1b: input.taxable_income,
      form6251_line2a: 0,
      ...input,
    }),
  );
  return fieldsOf(result.outputs, f1040)?.line16_income_tax;
}

test("TY2026 24% bracket ceilings match Pub 505 (2026) Worksheet 2-7 line 13b", () => {
  assertEquals(rate24BracketCeiling(FilingStatus.Single, 2026), 201_775);
  assertEquals(rate24BracketCeiling(FilingStatus.MFS, 2026), 201_775);
  assertEquals(rate24BracketCeiling(FilingStatus.HOH, 2026), 201_750);
  assertEquals(rate24BracketCeiling(FilingStatus.MFJ, 2026), 403_550);
  assertEquals(rate24BracketCeiling(FilingStatus.QSS, 2026), 403_550);
  // 2025 Schedule D Tax Worksheet line 19.
  assertEquals(rate24BracketCeiling(FilingStatus.Single, 2025), 197_300);
  assertEquals(rate24BracketCeiling(FilingStatus.MFJ, 2025), 394_600);
});

test("TY2026 QDCGT worksheet uses the Rev. Proc. 2025-32 §4.03 breakpoints", () => {
  // Single, taxable income $61,500 with $500 QD and $4,200 net gain: all
  // $4,700 sits above the $49,450 0% ceiling, so $705 at 15% plus the
  // $56,800 row-midpoint tax ($5,800 + 22% x $6,425 = $7,213.50 -> $7,214).
  assertEquals(
    tax2026({
      taxable_income: 61_500,
      filing_status: FilingStatus.Single,
      qualified_dividends: 500,
      net_capital_gain: 4_200,
    }),
    7_919,
  );
  // MFJ, $90,000 taxable with $20,000 QD: the 2026 0% ceiling is $98,900,
  // so every dividend is taxed at 0%. Tax on $70,000 ($70,025 midpoint):
  // $2,480 + 12% x ($70,025 - $24,800) = $7,907.
  assertEquals(
    tax2026({
      taxable_income: 90_000,
      filing_status: FilingStatus.MFJ,
      qualified_dividends: 20_000,
    }),
    7_907,
  );
});

test("TY2026 Schedule D Tax Worksheet stops 25% gain at the $201,775 ceiling", () => {
  // Single, line 1 $250,000 with $50,000 net capital gain, $20,000 of it
  // unrecaptured section 1250 gain. Line 21 is $201,775 (Pub 505 (2026)
  // Worksheet 2-7 line 13b); $30,000 at 15% ($4,500); line 39 $18,225 at
  // 25% ($4,556.25); tax on $201,775 is $17,966 + 24% x $96,075 = $41,024
  // (Rev. Proc. 2025-32 §4.01 Table 3). Total $50,080.25.
  assertEquals(
    tax2026({
      taxable_income: 250_000,
      filing_status: FilingStatus.Single,
      net_capital_gain: 50_000,
      unrecaptured_1250_gain: 20_000,
    }),
    50_080,
  );
});

// Draft 2026 Form 8814 line 15: the child's tax on the first $2,700 is at
// most $135 (10% of $1,350), added to the parent's tax as in 2025.
test("TY2026 adds Form 8814 tax and still refuses Schedule J", () => {
  const base = { taxable_income: 40_000, filing_status: FilingStatus.Single };
  const parentTax = tax2026(base);
  if (parentTax === undefined) throw new Error("expected line 16 tax");
  assertEquals(tax2026({ ...base, form8814_tax: 135 }), parentTax + 135);
  assertThrows(
    () =>
      tax2026({
        ...base,
        schedule_j_election_requested: true,
        schedule_j_calculated_tax: 4_000,
      }),
    Error,
    "TY2026 Schedule J tax worksheets are not supported yet",
  );
});
