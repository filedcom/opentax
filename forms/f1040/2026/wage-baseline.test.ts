import { assertEquals, assertThrows } from "@std/assert";
import { calculateWageBaseline2026 } from "./wage-baseline.ts";

Deno.test("2026 wage baseline uses shared algorithms and 2026 constants", () => {
  // Rev. Proc. 2025-32 §§4.01, 4.14:
  // Single: 150000 - 16100 = 133900; 17966 + (133900 - 105700)*.24 = 24734.
  const single = calculateWageBaseline2026({
    filing_status: "single",
    wages: [150_000],
  });
  assertEquals(single.baseStandardDeduction, 16_100);
  assertEquals(single.taxableIncomeBeforeOtherDeductions, 133_900);
  assertEquals(single.ordinaryTaxBeforeCreditsAndOtherTaxes, 24_734);
  assertEquals(single.canFile, false);
  assertEquals(single.status, "calculation-preview");
  assertEquals(single.method, "annual-rate-schedule");
  // Joint: 150000 - 32200 = 117800; 11600 + (117800 - 100800)*.22 = 15340.
  const joint = calculateWageBaseline2026({
    filing_status: "mfj",
    wages: [90_000, 60_000],
  });
  assertEquals(joint.ordinaryTaxBeforeCreditsAndOtherTaxes, 15_340);
  assertEquals(joint.baseStandardDeduction, 32_200);
});

Deno.test("2026 wage baseline aggregates cents before whole-dollar rounding", () => {
  const result = calculateWageBaseline2026({
    filing_status: "single",
    wages: [10_000.49, 6_100.49],
  });
  assertEquals(result.wages, 16_101);
  assertEquals(result.taxableIncomeBeforeOtherDeductions, 1);
  assertEquals(
    calculateWageBaseline2026({ filing_status: "single", wages: [0] })
      .ordinaryTaxBeforeCreditsAndOtherTaxes,
    0,
  );
});

Deno.test("2026 wage baseline rejects unsupported facts instead of silently omitting them", () => {
  for (
    const input of [
      { filing_status: "single", wages: [150_000], credits: 2_200 },
      {
        filing_status: "single",
        wages: [150_000],
        taxpayer_age_65_or_older: true,
      },
      { filing_status: "single", wages: [150_000], taxYear: 2025 },
      { filing_status: "invalid", wages: [150_000] },
      { filing_status: "single", wages: [] },
      { filing_status: "single", wages: [-1] },
      { filing_status: "single", wages: [NaN] },
      { filing_status: "single", wages: [Infinity] },
      { filing_status: "single", wages: [Number.MAX_VALUE, Number.MAX_VALUE] },
    ]
  ) assertThrows(() => calculateWageBaseline2026(input));
});
