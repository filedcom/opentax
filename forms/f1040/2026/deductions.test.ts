import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../nodes/types.ts";
import {
  calculateDeductions2026,
  type Deductions2026Input,
} from "./deductions.ts";

const base: Deductions2026Input = {
  filingStatus: FilingStatus.Single,
  adjustedGrossIncome: 80_000,
  method: "standard",
  standardDeduction: 16_100,
  itemizedDeductions: 0,
  nonitemizerCashContributions: 1_200,
  schedule1aLine44: 3_000,
  qbiDeduction: 2_000,
};

Deno.test("TY2026 single nonitemizer caps 12f at $1,000 and routes 13a/13b", () => {
  const result = calculateDeductions2026(base);
  assertEquals(result.line12eStandardOrItemized, 16_100);
  assertEquals(result.line12fNonitemizerCharity, 1_000);
  assertEquals(result.line13aSchedule1a, 3_000);
  assertEquals(result.line13bQbi, 2_000);
  assertEquals(result.line14TotalDeductions, 22_100);
  assertEquals(result.line15TaxableIncome, 57_900);
});

Deno.test("TY2026 MFJ nonitemizer caps 12f at $2,000", () => {
  const result = calculateDeductions2026({
    ...base,
    filingStatus: FilingStatus.MFJ,
    standardDeduction: 32_200,
    nonitemizerCashContributions: 2_500,
  });
  assertEquals(result.line12fNonitemizerCharity, 2_000);
});

Deno.test("TY2026 itemizer gets no line 12f deduction", () => {
  const result = calculateDeductions2026({
    ...base,
    method: "itemized",
    itemizedDeductions: 24_000,
  });
  assertEquals(result.line12eStandardOrItemized, 24_000);
  assertEquals(result.line12fNonitemizerCharity, 0);
  assertEquals(result.line15TaxableIncome, 51_000);
});

Deno.test("TY2026 taxable income floors at zero and rejects invalid amounts", () => {
  assertEquals(
    calculateDeductions2026({ ...base, adjustedGrossIncome: 5_000 })
      .line15TaxableIncome,
    0,
  );
  assertEquals(
    calculateDeductions2026({ ...base, adjustedGrossIncome: -5_000 })
      .line15TaxableIncome,
    0,
  );
  assertThrows(
    () => calculateDeductions2026({ ...base, qbiDeduction: -1 }),
    RangeError,
    "nonnegative",
  );
});
