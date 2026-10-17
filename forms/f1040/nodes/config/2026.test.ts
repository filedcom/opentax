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
  assertEquals(config2026.feieHousingBase, 0.16 * config2026.feieLimit);
  assertEquals(config2026.qbiThresholdMfj + config2026.qbiPhaseInRange, 553_500);
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
