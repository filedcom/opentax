import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../nodes/types.ts";
import {
  type DeductionResolution2026Input,
  noQbi2026,
  type QbiCalculator2026,
  resolveDeductions2026,
} from "./deduction-resolution.ts";
import { overallItemizedLimit2026 } from "./itemized-deductions.ts";

const base: DeductionResolution2026Input = {
  filing_status: FilingStatus.Single,
  adjustedGrossIncome: 150_000,
  standardDeductionEligible: true,
  nonitemizerCashContributions: 0,
  schedule1aLine44: 0,
  schedule1aLine43: 0,
};
Deno.test("2026 deduction choice includes cash charity and retains both calculated candidates", () => {
  const result = resolveDeductions2026({
    ...base,
    nonitemizerCashContributions: 1_500,
    itemized: { beforeOverallLimit: 16_800, taxes: 1_000 },
  }, noQbi2026);
  assertEquals(result.selected.method, "standard");
  assertEquals(result.standard?.line12fNonitemizerCharity, 1_000);
  assertEquals(result.standard?.line14TotalDeductions, 17_100);
  assertEquals(result.itemized.line14TotalDeductions, 16_800);
  assertEquals(result.selected.line15TaxableIncome, 132_900);
  assertEquals(result.reason, "standard_total_at_least_itemized");
  const elected = resolveDeductions2026({
    ...base,
    nonitemizerCashContributions: 1_000,
    itemized: { beforeOverallLimit: 0, taxes: 0 },
    electItemized: true,
  }, noQbi2026);
  assertEquals(elected.selected.method, "itemized");
  assertEquals(elected.selected.line12fNonitemizerCharity, 0);
  assertEquals(elected.reason, "itemization_election");
});
Deno.test("2026 shared standard amount handles dependent and age/blind additions", () => {
  const result = resolveDeductions2026({
    ...base,
    adjustedGrossIncome: 4_000,
    taxpayer_can_be_claimed_as_dependent: true,
    dependent_earned_income: 800,
    taxpayer_blind: true,
  }, noQbi2026);
  assertEquals(result.selected.line12eStandardOrItemized, 3_400);
  assertEquals(result.selected.line15TaxableIncome, 600);
  assertThrows(
    () =>
      resolveDeductions2026({
        ...base,
        taxpayer_can_be_claimed_as_dependent: true,
      }, noQbi2026),
    Error,
    "earned income",
  );
  const joint = resolveDeductions2026({
    ...base,
    filing_status: FilingStatus.MFJ,
    taxpayer_age_65_or_older: true,
    spouse_blind: true,
    nonitemizerCashContributions: 3_000,
  }, noQbi2026);
  assertEquals(joint.selected.line12eStandardOrItemized, 35_500);
  assertEquals(joint.selected.line12fNonitemizerCharity, 2_000);
});
Deno.test("2026 forced itemization and residency exclusion require Schedule A even at zero", () => {
  for (
    const extra of [
      { filing_status: FilingStatus.MFS, spouseItemizes: true },
      { standardDeductionEligible: false },
    ]
  ) {
    assertThrows(
      () => resolveDeductions2026({ ...base, ...extra }, noQbi2026),
      Error,
      "explicit finalized Schedule A",
    );
    const result = resolveDeductions2026({
      ...base,
      ...extra,
      itemized: { beforeOverallLimit: 0, taxes: 0 },
    }, noQbi2026);
    assertEquals(result.standard, undefined);
    assertEquals(result.selected.line12eStandardOrItemized, 0);
    assertEquals(result.selected.method, "itemized");
  }
  assertThrows(
    () => resolveDeductions2026({ ...base, spouseItemizes: true }, noQbi2026),
    Error,
    "requires MFS",
  );
});
Deno.test("2026 Schedule A overall limit uses status thresholds and both additional deductions", () => {
  for (
    const [filingStatus, threshold] of [
      [FilingStatus.Single, 640_600],
      [FilingStatus.HOH, 640_600],
      [FilingStatus.MFJ, 768_700],
      [FilingStatus.QSS, 768_700],
      [FilingStatus.MFS, 384_350],
    ] as const
  ) {
    const common = {
      filingStatus,
      adjustedGrossIncome: threshold + 30_000,
      schedule1aDeduction: 5_000,
      qbiDeduction: 15_000,
      itemizedBeforeOverallLimit: 50_000,
    };
    assertEquals(overallItemizedLimit2026(common).reduction, 540);
    assertEquals(
      overallItemizedLimit2026({
        ...common,
        adjustedGrossIncome: threshold + 20_000,
      }).reduction,
      0,
    );
    assertEquals(
      overallItemizedLimit2026({
        ...common,
        adjustedGrossIncome: threshold + 200_000,
      }).reduction,
      2_700,
    );
  }
});
Deno.test("2026 resolver supplies distinct actual pre-QBI income for standard and itemized", () => {
  const incomeLimit: QbiCalculator2026 = {
    maximumDeduction: 20_000,
    evaluate: (income) => ({
      deduction: Math.min(
        20_000,
        Math.round(Math.max(0, income - 5_000) * 0.2),
      ),
      forms: { preQbi: income },
    }),
  };
  const result = resolveDeductions2026({
    ...base,
    adjustedGrossIncome: 60_000,
    itemized: { beforeOverallLimit: 30_000, taxes: 10_000 },
  }, incomeLimit);
  assertEquals(result.standard?.qbi.deduction, 7_780);
  assertEquals(result.itemized.qbi.deduction, 5_000);
  assertEquals(result.standard?.preQbiTaxableIncome, 43_900);
  assertEquals(result.itemized.preQbiTaxableIncome, 30_000);
  assertEquals(result.selected.line15TaxableIncome, 25_000);
  assertEquals(result.selected.qbi.forms, { preQbi: 30_000 });
});
Deno.test("2026 QBI excludes section 68 before calculating the overall itemized limit", () => {
  // QBI uses 780,000 - 100,000 = 680,000, so Q = 136,000.
  // Section 68 excess = 3,400; reduction = round(183.60) = 184.
  const qbi: QbiCalculator2026 = {
    maximumDeduction: 200_000,
    evaluate: (income) => ({
      deduction: Math.round(income * 0.2),
      forms: { income },
    }),
  };
  const result = resolveDeductions2026({
    ...base,
    adjustedGrossIncome: 780_000,
    itemized: { beforeOverallLimit: 100_000, taxes: 40_000 },
  }, qbi);
  assertEquals(result.itemized.line12eStandardOrItemized, 99_816);
  assertEquals(result.itemized.qbi.deduction, 136_000);
  assertEquals(result.itemizedLimit.reduction, 184);
  assertEquals(result.selected.method, "itemized");
  assertEquals(
    result.itemized.qbi.deduction,
    Math.round(result.itemized.preQbiTaxableIncome * 0.2),
  );
  assertEquals(
    result.itemized.line12eStandardOrItemized,
    overallItemizedLimit2026({
      filingStatus: FilingStatus.Single,
      adjustedGrossIncome: 780_000,
      schedule1aDeduction: 0,
      qbiDeduction: result.itemized.qbi.deduction,
      itemizedBeforeOverallLimit: 100_000,
    }).allowedItemizedDeductions,
  );
});
Deno.test("2026 section 68 cannot change a QBI threshold or create artificial rounding cycles", () => {
  const seen: number[] = [];
  const result = resolveDeductions2026({
    ...base,
    adjustedGrossIncome: 640_619,
    itemized: { beforeOverallLimit: 30_000, taxes: 0 },
  }, {
    maximumDeduction: 10,
    evaluate: (income) => {
      seen.push(income);
      return { deduction: income === 610_619 ? 0 : 10, forms: {} };
    },
  });
  assertEquals(result.itemized.preQbiTaxableIncome, 610_619);
  assertEquals(result.itemized.qbi.deduction, 0);
  assertEquals(result.itemized.line12eStandardOrItemized, 29_999);
  assertEquals(result.itemizedEvaluations, 1);
  assertEquals(seen.includes(610_620), false);
});
Deno.test("2026 AMT bridge removes only Schedule 1-A line 43 and preserves a negative line 1b", () => {
  const result = resolveDeductions2026({
    ...base,
    adjustedGrossIncome: 10_000,
    nonitemizerCashContributions: 1_000,
    schedule1aLine44: 8_000,
    schedule1aLine43: 6_000,
  }, noQbi2026);
  assertEquals(result.selected.line14TotalDeductions, 25_100);
  assertEquals(result.selected.line15TaxableIncome, 0);
  assertEquals(result.selected.form6251Line1a, 19_100);
  assertEquals(result.selected.form6251Line1b, -9_100);
  assertEquals(result.selected.form6251Line2a, 16_100);
  assertThrows(
    () => resolveDeductions2026({ ...base, schedule1aLine43: 1 }, noQbi2026),
    Error,
    "exceeds",
  );
});
Deno.test("2026 deduction resolver rejects invalid amounts and out-of-bound QBI", () => {
  assertThrows(
    () =>
      resolveDeductions2026(
        { ...base, adjustedGrossIncome: Infinity },
        noQbi2026,
      ),
    Error,
    "finite",
  );
  assertThrows(
    () =>
      resolveDeductions2026({
        ...base,
        itemized: { beforeOverallLimit: 1, taxes: 2 },
      }, noQbi2026),
    Error,
    "exceed",
  );
  assertThrows(
    () =>
      resolveDeductions2026(base, {
        maximumDeduction: 1,
        evaluate: () => ({ deduction: 2, forms: {} }),
      }),
    Error,
    "bound",
  );
  assertThrows(
    () =>
      overallItemizedLimit2026({
        filingStatus: FilingStatus.Single,
        adjustedGrossIncome: 1.5,
        schedule1aDeduction: 0,
        qbiDeduction: 0,
        itemizedBeforeOverallLimit: 0,
      }),
    Error,
    "whole-dollar",
  );
});

Deno.test("2026 nonitemizer cash applies the retained contribution-base ceiling without the itemizer floor", () => {
  const lowIncome = resolveDeductions2026({
    ...base,
    adjustedGrossIncome: 1_000,
    nonitemizerCashContributions: 1_500,
  }, noQbi2026);
  assertEquals(lowIncome.selected.line12fNonitemizerCharity, 600);
  const carryback = resolveDeductions2026({
    ...base,
    adjustedGrossIncome: 1_000,
    charitableContributionBase: 2_000,
    nonitemizerCashContributions: 1_500,
  }, noQbi2026);
  assertEquals(carryback.selected.line12fNonitemizerCharity, 1_000);
  const negative = resolveDeductions2026({
    ...base,
    adjustedGrossIncome: -1_000,
    nonitemizerCashContributions: 500,
  }, noQbi2026);
  assertEquals(negative.selected.line12fNonitemizerCharity, 0);
  assertThrows(
    () =>
      resolveDeductions2026(
        { ...base, charitableContributionBase: 1 },
        noQbi2026,
      ),
    Error,
    "below AGI",
  );
});
