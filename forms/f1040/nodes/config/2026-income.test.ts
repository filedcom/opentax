import { assertAlmostEquals, assertEquals, assertThrows } from "@std/assert";
import { incomeTax2026, standardDeduction2026 } from "./2026-income.ts";
import { config2025 } from "./2025.ts";
import { FilingStatus } from "../types.ts";
import {
  bracketsForStatus,
  rateScheduleTax,
  taxFromBrackets,
} from "../intermediate/worksheets/taxes/calculation/tax_brackets.ts";
import { ordinaryTax2025 } from "../intermediate/worksheets/taxes/calculation/tax_table_2025.ts";
import { standardDeductionAmount } from "../intermediate/worksheets/deductions/standard/standard_deduction/amount.ts";
import { standardAmountFor2025 } from "../intermediate/worksheets/deductions/standard/standard_deduction/index.ts";

Deno.test("2026 bracket transitions are continuous with the published marginal rates", () => {
  for (const status of Object.values(FilingStatus)) {
    const brackets = bracketsForStatus(status, incomeTax2026);
    for (let i = 1; i < brackets.length; i++) {
      const row = brackets[i];
      const previous = brackets[i - 1];
      assertEquals(row.over, previous.upTo);
      assertAlmostEquals(taxFromBrackets(row.over, brackets), row.base);
      assertAlmostEquals(
        taxFromBrackets(row.over - 1, brackets),
        row.base - previous.rate,
      );
      assertAlmostEquals(
        taxFromBrackets(row.over + 1, brackets),
        row.base + row.rate,
      );
    }
  }
});

Deno.test("2026 rate schedules agree with independent IRS table arithmetic", () => {
  // $300,000 taxable income exercises status-specific bases, including HOH.
  for (
    const [status, expected] of [
      [FilingStatus.Single, 73_769],
      [FilingStatus.MFS, 73_769],
      [FilingStatus.MFJ, 57_196],
      [FilingStatus.QSS, 57_196],
      [FilingStatus.HOH, 71_961],
    ] as const
  ) assertEquals(rateScheduleTax(300_000, status, incomeTax2026), expected);
  // Upper MFS bracket differs from Single even though lower rates coincide.
  assertEquals(
    rateScheduleTax(500_000, FilingStatus.MFS, incomeTax2026),
    146_082,
  );
  assertEquals(
    rateScheduleTax(500_000, FilingStatus.Single, incomeTax2026),
    143_769,
  );
  assertEquals(rateScheduleTax(0, FilingStatus.Single, incomeTax2026), 0);
  for (const amount of [-1, NaN, Infinity]) {
    assertThrows(() =>
      rateScheduleTax(amount, FilingStatus.Single, incomeTax2026)
    );
  }
  assertThrows(() =>
    rateScheduleTax(100, "invalid" as FilingStatus, incomeTax2026)
  );
});

Deno.test("shared deduction calculation uses each year's amounts and dependent limits", () => {
  const expected = {
    [FilingStatus.Single]: 16_100,
    [FilingStatus.MFS]: 16_100,
    [FilingStatus.MFJ]: 32_200,
    [FilingStatus.HOH]: 24_150,
    [FilingStatus.QSS]: 32_200,
  };
  for (const status of Object.values(FilingStatus)) {
    assertEquals(
      standardDeductionAmount({ filing_status: status }, standardDeduction2026),
      expected[status],
    );
  }
  const single = { filing_status: FilingStatus.Single };
  assertEquals(standardAmountFor2025({ ...single, agi: 150_000 }), 15_750);
  assertEquals(
    standardDeductionAmount({
      ...single,
      taxpayer_age_65_or_older: true,
      taxpayer_blind: true,
    }, standardDeduction2026),
    20_200,
  );
  assertEquals(
    standardDeductionAmount({
      filing_status: FilingStatus.MFJ,
      taxpayer_age_65_or_older: true,
      spouse_age_65_or_older: true,
    }, standardDeduction2026),
    35_500,
  );
  for (
    const [earned, deduction] of [[0, 1350], [899, 1350], [901, 1351], [
      30_000,
      16_100,
    ]]
  ) {
    assertEquals(
      standardDeductionAmount({
        ...single,
        taxpayer_can_be_claimed_as_dependent: true,
        dependent_earned_income: earned,
      }, standardDeduction2026),
      deduction,
    );
  }
  assertThrows(() =>
    standardDeductionAmount({
      ...single,
      taxpayer_can_be_claimed_as_dependent: true,
    }, standardDeduction2026)
  );
});

Deno.test("2025 ordinary-tax behavior stays isolated from the 2026 schedules", () => {
  // Published 2025 table cell; rate-schedule calculation would instead be $5,914.
  assertEquals(ordinaryTax2025(50_000, FilingStatus.Single), 5_920);
  assertEquals(
    rateScheduleTax(50_000, FilingStatus.Single, incomeTax2026),
    5_752,
  );
  assertEquals(ordinaryTax2025(100_000, FilingStatus.Single), 16_914);
  assertEquals(
    rateScheduleTax(100_000, FilingStatus.Single, incomeTax2026),
    16_712,
  );
  assertEquals(
    rateScheduleTax(134_250, FilingStatus.Single, config2025),
    25_067,
  );
});
