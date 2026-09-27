import { assertEquals } from "@std/assert";
import { FilingStatus } from "../types.ts";
import { config2025 } from "./2025.ts";
import { INDEXED_CONFIG_2026 } from "./2026-indexed.ts";
import { qbiThresholdForStatus } from "./qbi.ts";

Deno.test("2026 tax brackets match published tax at every boundary", () => {
  for (
    const brackets of [
      INDEXED_CONFIG_2026.bracketsMfj,
      INDEXED_CONFIG_2026.bracketsSingle,
      INDEXED_CONFIG_2026.bracketsHoh,
      INDEXED_CONFIG_2026.bracketsMfs,
    ]
  ) {
    assertEquals(brackets[0].over, 0);
    for (let index = 1; index < brackets.length; index++) {
      const previous = brackets[index - 1];
      const current = brackets[index];
      assertEquals(previous.upTo, current.over);
      assertEquals(
        previous.base + (previous.upTo - previous.over) * previous.rate,
        current.base,
      );
    }
  }
  assertEquals(INDEXED_CONFIG_2026.bracketsMfj[6].base, 206_583.50);
  assertEquals(INDEXED_CONFIG_2026.bracketsMfs[6].over, 384_350);
});

Deno.test("2026 standard deduction and kiddie floor use published amounts", () => {
  assertEquals(
    INDEXED_CONFIG_2026.standardDeductionBase[FilingStatus.HOH],
    24_150,
  );
  assertEquals(
    INDEXED_CONFIG_2026.standardDeductionAdditional[FilingStatus.QSS],
    1_650,
  );
  assertEquals(INDEXED_CONFIG_2026.kiddieStandardDeductionFloor, 1_350);
  assertEquals(INDEXED_CONFIG_2026.seniorDeductionMax, 6_000);
  assertEquals(INDEXED_CONFIG_2026.seniorDeductionPhaseoutRate, 0.06);
});

Deno.test("2026 QBI threshold distinguishes MFS from other nonjoint returns", () => {
  assertEquals(
    qbiThresholdForStatus(FilingStatus.Single, INDEXED_CONFIG_2026),
    201_750,
  );
  assertEquals(
    qbiThresholdForStatus(FilingStatus.MFS, INDEXED_CONFIG_2026),
    201_775,
  );
  assertEquals(
    qbiThresholdForStatus(FilingStatus.MFJ, INDEXED_CONFIG_2026),
    403_500,
  );
  assertEquals(INDEXED_CONFIG_2026.qbiPhaseInRange / 2, 75_000);
  assertEquals(qbiThresholdForStatus(FilingStatus.MFS, config2025), 197_300);
});

Deno.test("2026 AMT thresholds use the new exemption phaseout starts", () => {
  assertEquals(
    INDEXED_CONFIG_2026.amtPhaseOutStart[FilingStatus.Single],
    500_000,
  );
  assertEquals(
    INDEXED_CONFIG_2026.amtPhaseOutStart[FilingStatus.MFJ],
    1_000_000,
  );
  assertEquals(INDEXED_CONFIG_2026.amtBracket26ThresholdMfs, 122_250);
  assertEquals(
    INDEXED_CONFIG_2026.amtBracketAdjustmentStandard,
    244_500 * 0.02,
  );
});

Deno.test("2026 EITC has all four family-size entries and distinct joint limits", () => {
  for (const children of [0, 1, 2, 3] as const) {
    assertEquals(typeof INDEXED_CONFIG_2026.eitcMaxCredit[children], "number");
    assertEquals(typeof INDEXED_CONFIG_2026.eitcPhaseInEnd[children], "number");
    assertEquals(
      INDEXED_CONFIG_2026.eitcIncomeLimit[children][1] >
        INDEXED_CONFIG_2026.eitcIncomeLimit[children][0],
      true,
    );
  }
  assertEquals(INDEXED_CONFIG_2026.eitcInvestmentIncomeLimit, 12_200);
});

Deno.test("2026 HSA, IRA, and Social Security amounts use their own sources", () => {
  assertEquals(INDEXED_CONFIG_2026.hsaSelfOnlyLimit, 4_400);
  assertEquals(INDEXED_CONFIG_2026.hsaFamilyLimit, 8_750);
  assertEquals(INDEXED_CONFIG_2026.iraContributionLimitAge50, 8_600);
  assertEquals(INDEXED_CONFIG_2026.ssTaxPerEmployer, 184_500 * 0.062);
  assertEquals(INDEXED_CONFIG_2026.ctcPerChild, 2_200);
  assertEquals(INDEXED_CONFIG_2026.actcMaxPerChild, 1_700);
  assertEquals(INDEXED_CONFIG_2026.odcPerDependent, 500);
  assertEquals(INDEXED_CONFIG_2026.actcEarnedIncomeFloor, 2_500);
  assertEquals(INDEXED_CONFIG_2026.saversCreditContributionCap, 2_000);
});

Deno.test("2026 SALT and FPL amounts use the pinned forms and guideline tables", () => {
  assertEquals(INDEXED_CONFIG_2026.saltCap, 40_400);
  assertEquals(INDEXED_CONFIG_2026.saltPhaseoutThresholdMfs, 252_500);
  assertEquals(INDEXED_CONFIG_2026.saltFloor, 10_000);
  assertEquals(INDEXED_CONFIG_2026.saltFloorMfs, 5_000);
  assertEquals(INDEXED_CONFIG_2026.saltPhaseoutRate, 0.30);
  assertEquals(INDEXED_CONFIG_2026.fplBase, 15_650);
  assertEquals(
    INDEXED_CONFIG_2026.fplBase + 3 * INDEXED_CONFIG_2026.fplIncrement,
    32_150,
  );
  assertEquals(
    INDEXED_CONFIG_2026.fplAlaskaBase +
      3 * INDEXED_CONFIG_2026.fplAlaskaIncrement,
    40_190,
  );
  assertEquals(
    INDEXED_CONFIG_2026.fplHawaiiBase +
      3 * INDEXED_CONFIG_2026.fplHawaiiIncrement,
    36_980,
  );
});

Deno.test("2026 Medicare and household tax thresholds match draft forms", () => {
  assertEquals(INDEXED_CONFIG_2026.additionalMedicareThresholdMfj, 250_000);
  assertEquals(INDEXED_CONFIG_2026.additionalMedicareThresholdMfs, 125_000);
  assertEquals(INDEXED_CONFIG_2026.additionalMedicareThresholdOther, 200_000);
  assertEquals(INDEXED_CONFIG_2026.householdFicaThreshold, 3_000);
  assertEquals(INDEXED_CONFIG_2026.householdFutaQuarterlyThreshold, 1_000);
  assertEquals(INDEXED_CONFIG_2026.niitThresholdMfj, 250_000);
  assertEquals(INDEXED_CONFIG_2026.niitThresholdMfs, 125_000);
  assertEquals(INDEXED_CONFIG_2026.niitThresholdOther, 200_000);
});

Deno.test("2026 passenger auto caps separate third and succeeding years", () => {
  assertEquals(INDEXED_CONFIG_2026.luxuryAutoYear1WithBonus, 20_300);
  assertEquals(INDEXED_CONFIG_2026.luxuryAutoYear1NoBonus, 12_300);
  assertEquals(INDEXED_CONFIG_2026.luxuryAutoYear2, 19_800);
  assertEquals(INDEXED_CONFIG_2026.luxuryAutoYear3, 11_900);
  assertEquals(INDEXED_CONFIG_2026.luxuryAutoYear4Plus, 7_160);
});

Deno.test("2026 Form 4972 allowance extinguishes at the printed cutoff", () => {
  assertEquals(INDEXED_CONFIG_2026.mdaMax, 10_000);
  assertEquals(INDEXED_CONFIG_2026.mdaPhaseOutThreshold, 20_000);
  assertEquals(INDEXED_CONFIG_2026.mdaZeroThreshold, 70_000);
  assertEquals(INDEXED_CONFIG_2026.deathBenefitMax, 5_000);
  assertEquals(INDEXED_CONFIG_2026.mccMaxCreditHighRate, 2_000);
  assertEquals(INDEXED_CONFIG_2026.scheduleBDividendThreshold, 1_500);
});

Deno.test("2026 enhanced SIMPLE plan has a distinct age 60–63 limit", () => {
  assertEquals(INDEXED_CONFIG_2026.retirementLimits.simple[49], 17_000);
  assertEquals(INDEXED_CONFIG_2026.retirementLimits.simpleHigher[49], 18_100);
  assertEquals(INDEXED_CONFIG_2026.retirementLimits.simple[63], 22_250);
  assertEquals(INDEXED_CONFIG_2026.retirementLimits.simpleHigher[63], 23_350);
});
