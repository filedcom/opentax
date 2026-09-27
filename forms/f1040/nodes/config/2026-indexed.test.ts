import { assertEquals } from "@std/assert";
import { FilingStatus } from "../types.ts";
import { config2025 } from "./2025.ts";
import { INDEXED_CONFIG_2026 } from "./2026-indexed.ts";
import { qbiThresholdForStatus } from "./qbi.ts";

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
});
