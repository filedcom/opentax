import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { FilingStatus } from "../types.ts";
import { CONFIG_BY_YEAR } from "./index.ts";
import { config2025 } from "./2025.ts";
import { config2026 } from "./2026.ts";
import { ordinaryTaxFromSchedule } from "../intermediate/worksheets/taxes/calculation/tax_table_2025.ts";

test("CONFIG_BY_YEAR routes 2026 to the TY2026 constants and keeps 2025", () => {
  assertEquals(CONFIG_BY_YEAR[2026], config2026);
  assertEquals(CONFIG_BY_YEAR[2025], config2025);
  assertEquals(
    Object.keys(config2026).sort(),
    Object.keys(config2025).sort(),
  );
});

test("2026 rate schedules match Rev. Proc. 2025-32 §4.01 at every boundary", () => {
  for (
    const brackets of [
      config2026.bracketsMfj,
      config2026.bracketsHoh,
      config2026.bracketsSingle,
      config2026.bracketsMfs,
    ]
  ) {
    for (let i = 1; i < brackets.length; i++) {
      const prior = brackets[i - 1];
      assertEquals(brackets[i].over, prior.upTo);
      assertEquals(
        Math.round((prior.base + (prior.upTo - prior.over) * prior.rate) * 100),
        Math.round(brackets[i].base * 100),
      );
    }
  }
  assertEquals(config2026.bracketsMfj.at(-1)?.over, 768_700);
  assertEquals(config2026.bracketsSingle.at(-1)?.base, 192_979.25);
  assertEquals(config2026.bracketsMfs.at(-1)?.base, 103_291.75);
  assertEquals(config2026.bracketsHoh.at(-1)?.base, 191_171);
});

test("2026 deductions and credits use the Rev. Proc. 2025-32 amounts", () => {
  assertEquals(config2026.standardDeductionBase[FilingStatus.Single], 16_100);
  assertEquals(config2026.standardDeductionBase[FilingStatus.MFJ], 32_200);
  assertEquals(config2026.standardDeductionBase[FilingStatus.HOH], 24_150);
  assertEquals(config2026.standardDeductionAdditional[FilingStatus.HOH], 2_050);
  assertEquals(config2026.standardDeductionAdditional[FilingStatus.MFJ], 1_650);
  assertEquals(config2026.qdcgtZeroCeiling[FilingStatus.MFJ], 98_900);
  assertEquals(config2026.qdcgtTwentyFloor[FilingStatus.Single], 545_500);
  assertEquals(config2026.amtExemption[FilingStatus.MFJ], 140_200);
  assertEquals(config2026.amtPhaseOutStart[FilingStatus.Single], 500_000);
  assertEquals(
    config2026.amtBracketAdjustmentStandard,
    config2026.amtBracket26ThresholdStandard * 0.02,
  );
  assertEquals(config2026.eitcInvestmentIncomeLimit, 12_200);
  assertEquals(config2026.kiddieUnearnedIncomeThreshold, 2 * 1_350);
  assertEquals(config2026.form8814ChildIncomeLimit, 10 * 1_350);
  assertEquals(config2026.feieHousingBase, 0.16 * config2026.feieLimit);
  assertEquals(
    config2026.qbiThresholdMfj + config2026.qbiPhaseInRange,
    553_500,
  );
  assertEquals(config2026.section179Limit, 2_560_000);
  assertEquals(config2026.eblThresholdMfj, 512_000);
  assertEquals(config2026.saltCap, 40_000 * 1.01);
  assertEquals(config2026.ssTaxPerEmployer, config2026.ssWageBase * 0.062);
  assertEquals(config2026.iraContributionLimit, 7_500);
  assertEquals(config2026.retirementLimits["401k"][63], 24_500 + 11_250);
  assertEquals(config2026.depCareEmployerExclusion, 7_500);
});

test("2026 ordinary tax is the Tax Table cell below $100,000 and the rate above", () => {
  // $34,400-$34,450 row, midpoint $34,425: $1,240 + 12% x $22,025.
  assertEquals(
    ordinaryTaxFromSchedule(34_410, config2026.bracketsSingle),
    3_883,
  );
  // At $100,000 the rate schedule applies: $2,480 + 12% x ($100,000 - $24,800).
  assertEquals(
    ordinaryTaxFromSchedule(100_000, config2026.bracketsMfj),
    11_504,
  );
  assertEquals(ordinaryTaxFromSchedule(0, config2026.bracketsSingle), 0);
});

test("2026 EIC amounts match Rev. Proc. 2025-32 §4.06 and the §32(b) rates", () => {
  const [none, one, two, three] = config2026.eitcByChildren;
  assertEquals(
    [none, one, two, three].map((row) => row.maxCredit),
    [664, 4_427, 7_316, 8_231],
  );
  assertEquals(one.phaseoutStartMfj, 31_160);
  assertEquals(none.phaseoutStart, 10_860);
  for (const row of config2026.eitcByChildren) {
    assertEquals(
      Math.round(row.earnedIncomeAmount * row.creditRate),
      row.maxCredit,
    );
    assertEquals(
      Math.round(row.phaseoutStart + row.maxCredit / row.phaseoutRate),
      row.phaseoutEnd,
    );
    assertEquals(
      row.phaseoutEndMfj - row.phaseoutEnd,
      row.phaseoutStartMfj - row.phaseoutStart,
    );
  }
});

test("2026 Schedule 1-A limits match P.L. 119-21 §§70201-70203 and the draft schedule", () => {
  assertEquals(config2026.qualifiedTipsCap, 25_000);
  assertEquals(
    config2026.qualifiedOvertimeCapMfj,
    2 * config2026.qualifiedOvertimeCap,
  );
  assertEquals(config2026.tipsOvertimePhaseoutThresholdMfj, 300_000);
  assertEquals(config2026.vehicleLoanInterestCap, 10_000);
  assertEquals(config2026.vehicleLoanInterestPhaseoutPerThousand, 200);
  assertEquals(config2026.seniorDeductionMax, 6_000);
});

test("2026-only itemized, charitable and QBI rules come from P.L. 119-21", () => {
  // §70424: $1,000/$2,000 for non-itemizers; §70425: 0.5% floor;
  // §70111: 2/37 reduction; §70105: $400 minimum QBI deduction.
  assertEquals(config2026.nonitemizerCharitableLimitMfj, 2_000);
  assertEquals(config2026.charitableAgiFloorRate, 0.005);
  assertEquals(config2026.itemizedDeductionReductionRate, 2 / 37);
  assertEquals(config2026.qbiMinimumDeduction, 400);
  // None of them apply to TY2025.
  assertEquals(config2025.nonitemizerCharitableLimit, 0);
  assertEquals(config2025.charitableAgiFloorRate, 0);
  assertEquals(config2025.itemizedDeductionReductionRate, 0);
  assertEquals(config2025.qbiMinimumDeduction, 0);
});

test("2026 dependent care credit follows the §70405 two-step percentage", () => {
  assertEquals(config2026.depCareCreditMaxRate, 0.50);
  assertEquals(config2026.depCareCreditFirstFloorRate, 0.35);
  assertEquals(
    config2026.depCareCreditSecondPhaseout?.agiThresholdMfj,
    150_000,
  );
  assertEquals(config2026.depCareCreditSecondPhaseout?.bracketSizeMfj, 4_000);
  assertEquals(config2026.depCareCreditSecondPhaseout?.floorRate, 0.20);
  assertEquals(config2025.depCareCreditSecondPhaseout, null);
});

test("2026 adoption, dependent and educator amounts match Rev. Proc. 2025-32", () => {
  // §4.04: phaseout complete at $305,080.
  assertEquals(
    config2026.adoptionPhaseoutStart + config2026.adoptionPhaseoutRange,
    305_080,
  );
  assertEquals(config2026.adoptionCreditRefundableMax, 5_120);
  assertEquals(config2026.qualifyingRelativeGrossIncomeLimit, 5_300);
  assertEquals(config2026.dependentStandardDeductionFloor, 1_350);
  assertEquals(config2026.educatorExpenseLimit, 350);
  assertEquals(config2026.luxuryAutoSucceedingYears, 7_160);
});

test("2026 mileage changes on July 1 under Announcement 2026-11", () => {
  assertEquals(
    config2026.standardMileageRates.map((
      period,
    ) => [period.from, period.business]),
    [["2026-01-01", 0.725], ["2026-07-01", 0.76]],
  );
  assertEquals(config2026.standardMileageRates[1].medicalMoving, 0.235);
  assertEquals(config2025.standardMileageRates[0].business, 0.70);
});

test("Trump account limits start in 2026 under P.L. 119-21 §70204", () => {
  assertEquals(config2026.trumpAccountContributionLimit, 5_000);
  assertEquals(config2026.trumpAccountEmployerExclusionLimit, 2_500);
  assertEquals(config2025.trumpAccountContributionLimit, 0);
});

test("2026 taxes and payments values match their sources", () => {
  // Draft 2026 Schedule SE lines 14-15 and Part II print $7,560, $11,340 and
  // $8,186: 150% of the maximum, and the maximum over 92.35%.
  assertEquals(config2026.seOptionalMethodMaximum, 7_560);
  assertEquals(config2026.seFarmOptionalGrossIncomeLimit, 7_560 * 1.5);
  assertEquals(
    config2026.seFarmOptionalNetProfitLimit,
    Math.round(7_560 / 0.9235),
  );
  assertEquals(config2026.ssTaxPerEmployer, config2026.ssWageBase * 0.062);
  // IRC §55(d)(4)(A)(ii)(IV); draft 2026 Form 6251 line 4: $640,200.
  assertEquals(config2026.amtExemptionPhaseOutRate, 0.5);
  assertEquals(
    config2026.amtPhaseOutStart[FilingStatus.MFS] +
      config2026.amtExemption[FilingStatus.MFS] /
        config2026.amtExemptionPhaseOutRate,
    640_200,
  );
  assertEquals(
    config2025.amtPhaseOutStart[FilingStatus.MFS] +
      config2025.amtExemption[FilingStatus.MFS] /
        config2025.amtExemptionPhaseOutRate,
    900_350,
  );
  // Rev. Proc. 2025-25 §3.01: bands meet and end at 9.96% through 400%.
  const bands = config2026.ptcApplicablePercentages;
  for (let i = 1; i < bands.length; i++) {
    assertEquals(bands[i].fromFplPct, bands[i - 1].toFplPct);
  }
  assertEquals(bands.at(-1)?.final, 996);
  assertEquals(config2026.ptcIncomeLimitFplPct, 400);
  assertEquals(config2026.ptcRepaymentCaps, []);
  assertEquals(config2026.fplBaseAlaska + 7 * config2026.fplIncrementAlaska, 67_710);
  assertEquals(config2026.fplBaseHawaii + 7 * config2026.fplIncrementHawaii, 62_300);
});
