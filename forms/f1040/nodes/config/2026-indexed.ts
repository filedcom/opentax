/**
 * Source-backed TY2026 config members. This module is not a complete
 * F1040Config; complete the remaining members before registering TY2026.
 * Sources are pinned in docs/ty2026/corpus/manifest.json.
 */
import { FilingStatus } from "../types.ts";
import type { F1040Config } from "./types.ts";

type IndexedKeys =
  | "qdcgtZeroCeiling"
  | "qdcgtTwentyFloor"
  | "amtExemption"
  | "amtPhaseOutStart"
  | "amtBracket26ThresholdStandard"
  | "amtBracket26ThresholdMfs"
  | "amtBracketAdjustmentStandard"
  | "amtBracketAdjustmentMfs"
  | "ssWageBase"
  | "ssTaxPerEmployer"
  | "hsaSelfOnlyLimit"
  | "hsaFamilyLimit"
  | "hsaCatchup"
  | "iraContributionLimit"
  | "iraContributionLimitAge50"
  | "iraPhaseoutSingleLower"
  | "iraPhaseoutSingleUpper"
  | "iraPhaseoutMfjLower"
  | "iraPhaseoutMfjUpper"
  | "iraPhaseoutNoncoveredMfjLower"
  | "iraPhaseoutNoncoveredMfjUpper"
  | "iraPhaseoutMfsLower"
  | "iraPhaseoutMfsUpper"
  | "qbiThresholdSingle"
  | "qbiThresholdMfs"
  | "qbiThresholdMfj"
  | "qbiPhaseInRange"
  | "eitcMaxCredit"
  | "eitcPhaseInEnd"
  | "eitcPhaseoutStart"
  | "eitcIncomeLimit"
  | "eitcInvestmentIncomeLimit"
  | "saversCreditAgiSingle"
  | "saversCreditAgiHoh"
  | "saversCreditAgiMfj"
  | "savingsBondPhaseoutStartMfj"
  | "savingsBondPhaseoutEndMfj"
  | "savingsBondPhaseoutStartSingle"
  | "savingsBondPhaseoutEndSingle"
  | "feieLimit"
  | "feieHousingBase"
  | "section179Limit"
  | "section179PhaseoutThreshold"
  | "qcdAnnualLimit"
  | "eblThresholdSingle"
  | "eblThresholdMfj"
  | "smallBizGrossReceipts"
  | "ltcPerDiemDailyLimit"
  | "ltcPremiumLimits"
  | "sliPhaseOutStartSingle"
  | "sliPhaseOutEndSingle"
  | "sliPhaseOutStartMfj"
  | "sliPhaseOutEndMfj"
  | "sepMaxContribution";

export const INDEXED_CONFIG_2026 = {
  // Rev. Proc. 2025-32 §4.03: zero and 15% capital-gain ceilings.
  qdcgtZeroCeiling: {
    [FilingStatus.Single]: 49_450,
    [FilingStatus.MFJ]: 98_900,
    [FilingStatus.MFS]: 49_450,
    [FilingStatus.HOH]: 66_200,
    [FilingStatus.QSS]: 98_900,
  },
  qdcgtTwentyFloor: {
    [FilingStatus.Single]: 545_500,
    [FilingStatus.MFJ]: 613_700,
    [FilingStatus.MFS]: 306_850,
    [FilingStatus.HOH]: 579_600,
    [FilingStatus.QSS]: 613_700,
  },

  // Rev. Proc. 2025-32 §4.10. The 2026 AMT phaseout starts at $500k/$1m.
  amtExemption: {
    [FilingStatus.Single]: 90_100,
    [FilingStatus.MFJ]: 140_200,
    [FilingStatus.MFS]: 70_100,
    [FilingStatus.HOH]: 90_100,
    [FilingStatus.QSS]: 140_200,
  },
  amtPhaseOutStart: {
    [FilingStatus.Single]: 500_000,
    [FilingStatus.MFJ]: 1_000_000,
    [FilingStatus.MFS]: 500_000,
    [FilingStatus.HOH]: 500_000,
    [FilingStatus.QSS]: 1_000_000,
  },
  amtBracket26ThresholdStandard: 244_500,
  amtBracket26ThresholdMfs: 122_250,
  amtBracketAdjustmentStandard: 4_890, // $244,500 × 2%.
  amtBracketAdjustmentMfs: 2_445, // $122,250 × 2%.

  // IRS Publication 505 (2026), Worksheet 2-3, line 5; employee rate 6.2%.
  ssWageBase: 184_500,
  ssTaxPerEmployer: 11_439,

  // Rev. Proc. 2025-19 §3.01(1); §223(b)(3) catch-up remains $1,000.
  hsaSelfOnlyLimit: 4_400,
  hsaFamilyLimit: 8_750,
  hsaCatchup: 1_000,

  // Notice 2025-67, pages 4–5, traditional IRA deduction ranges.
  iraContributionLimit: 7_500,
  iraContributionLimitAge50: 8_600,
  iraPhaseoutSingleLower: 81_000,
  iraPhaseoutSingleUpper: 91_000,
  iraPhaseoutMfjLower: 129_000,
  iraPhaseoutMfjUpper: 149_000,
  iraPhaseoutNoncoveredMfjLower: 242_000,
  iraPhaseoutNoncoveredMfjUpper: 252_000,
  iraPhaseoutMfsLower: 0,
  iraPhaseoutMfsUpper: 10_000,

  // Rev. Proc. 2025-32 §4.26. MFS differs from other nonjoint returns.
  qbiThresholdSingle: 201_750,
  qbiThresholdMfs: 201_775,
  qbiThresholdMfj: 403_500,
  qbiPhaseInRange: 150_000,

  // Rev. Proc. 2025-32 §4.06, 0/1/2/3+ qualifying children.
  eitcMaxCredit: { 0: 664, 1: 4_427, 2: 7_316, 3: 8_231 },
  eitcPhaseInEnd: { 0: 8_680, 1: 13_020, 2: 18_290, 3: 18_290 },
  // Each tuple is [other statuses, MFJ].
  eitcPhaseoutStart: {
    0: [10_860, 18_140],
    1: [23_890, 31_160],
    2: [23_890, 31_160],
    3: [23_890, 31_160],
  },
  eitcIncomeLimit: {
    0: [19_540, 26_820],
    1: [51_593, 58_863],
    2: [58_629, 65_899],
    3: [62_974, 70_244],
  },
  eitcInvestmentIncomeLimit: 12_200,

  // Notice 2025-67, pages 3–4, §25B retirement savings credit limits.
  saversCreditAgiSingle: { rate50: 24_250, rate20: 26_250, rate10: 40_250 },
  saversCreditAgiHoh: { rate50: 36_375, rate20: 39_375, rate10: 60_375 },
  saversCreditAgiMfj: { rate50: 48_500, rate20: 52_500, rate10: 80_500 },

  // Rev. Proc. 2025-32 §4.17, U.S. savings bond interest exclusion.
  savingsBondPhaseoutStartMfj: 152_650,
  savingsBondPhaseoutEndMfj: 182_650,
  savingsBondPhaseoutStartSingle: 101_800,
  savingsBondPhaseoutEndSingle: 116_800,

  // Rev. Proc. 2025-32 §§4.39, 4.24, 4.31, 4.30, 4.62, 4.27, 4.29.
  feieLimit: 132_900,
  feieHousingBase: 21_264, // §911(c)(1)(B): 16% × $132,900.
  section179Limit: 2_560_000,
  section179PhaseoutThreshold: 4_090_000,
  eblThresholdSingle: 256_000,
  eblThresholdMfj: 512_000,
  smallBizGrossReceipts: 32_000_000,
  ltcPerDiemDailyLimit: 430,
  ltcPremiumLimits: [
    { maxAge: 40, limit: 500 },
    { maxAge: 50, limit: 930 },
    { maxAge: 60, limit: 1_860 },
    { maxAge: 70, limit: 4_960 },
    { maxAge: Infinity, limit: 6_200 },
  ],
  sliPhaseOutStartSingle: 85_000,
  sliPhaseOutEndSingle: 100_000,
  sliPhaseOutStartMfj: 175_000,
  sliPhaseOutEndMfj: 205_000,

  // Notice 2025-67: §408(d)(8) QCD and §415(c) plan contribution limit.
  qcdAnnualLimit: 111_000,
  sepMaxContribution: 72_000,
} satisfies Pick<F1040Config, IndexedKeys>;
