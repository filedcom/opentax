/**
 * Source-backed TY2026 config members. This module is not a complete
 * F1040Config; complete the remaining members before registering TY2026.
 * Sources are pinned in docs/ty2026/corpus/manifest.json.
 */
import { FilingStatus } from "../types.ts";
import type { F1040Config } from "./types.ts";

type IndexedKeys =
  | "bracketsMfj"
  | "bracketsSingle"
  | "bracketsHoh"
  | "bracketsMfs"
  | "standardDeductionBase"
  | "standardDeductionAdditional"
  | "seniorDeductionMax"
  | "seniorDeductionPhaseoutSingle"
  | "seniorDeductionPhaseoutMfj"
  | "seniorDeductionPhaseoutRate"
  | "kiddieUnearnedIncomeThreshold"
  | "kiddieStandardDeductionFloor"
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
  | "additionalMedicareThresholdMfj"
  | "additionalMedicareThresholdMfs"
  | "additionalMedicareThresholdOther"
  | "niitThresholdMfj"
  | "niitThresholdMfs"
  | "niitThresholdOther"
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
  | "ctcPerChild"
  | "actcMaxPerChild"
  | "actcEarnedIncomeFloor"
  | "ctcPhaseOutThresholdMfj"
  | "ctcPhaseOutThresholdOther"
  | "odcPerDependent"
  | "saversCreditContributionCap"
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
  | "luxuryAutoYear1NoBonus"
  | "luxuryAutoYear1WithBonus"
  | "luxuryAutoYear2"
  | "luxuryAutoYear3"
  | "luxuryAutoYear4Plus"
  | "householdFicaThreshold"
  | "householdFutaQuarterlyThreshold"
  | "saltCap"
  | "saltPhaseoutThreshold"
  | "saltPhaseoutThresholdMfs"
  | "saltFloor"
  | "saltFloorMfs"
  | "saltPhaseoutRate"
  | "fplBase"
  | "fplIncrement"
  | "fplAlaskaBase"
  | "fplAlaskaIncrement"
  | "fplHawaiiBase"
  | "fplHawaiiIncrement"
  | "qcdAnnualLimit"
  | "mdaMax"
  | "mdaPhaseOutThreshold"
  | "mdaZeroThreshold"
  | "deathBenefitMax"
  | "mccMaxCreditHighRate"
  | "scheduleBDividendThreshold"
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
  // Rev. Proc. 2025-32 §4.01, Tables 1–4. Base is the published tax at `over`.
  bracketsMfj: [
    { over: 0, upTo: 24_800, rate: 0.10, base: 0 },
    { over: 24_800, upTo: 100_800, rate: 0.12, base: 2_480 },
    { over: 100_800, upTo: 211_400, rate: 0.22, base: 11_600 },
    { over: 211_400, upTo: 403_550, rate: 0.24, base: 35_932 },
    { over: 403_550, upTo: 512_450, rate: 0.32, base: 82_048 },
    { over: 512_450, upTo: 768_700, rate: 0.35, base: 116_896 },
    { over: 768_700, upTo: Infinity, rate: 0.37, base: 206_583.50 },
  ],
  bracketsHoh: [
    { over: 0, upTo: 17_700, rate: 0.10, base: 0 },
    { over: 17_700, upTo: 67_450, rate: 0.12, base: 1_770 },
    { over: 67_450, upTo: 105_700, rate: 0.22, base: 7_740 },
    { over: 105_700, upTo: 201_750, rate: 0.24, base: 16_155 },
    { over: 201_750, upTo: 256_200, rate: 0.32, base: 39_207 },
    { over: 256_200, upTo: 640_600, rate: 0.35, base: 56_631 },
    { over: 640_600, upTo: Infinity, rate: 0.37, base: 191_171 },
  ],
  bracketsSingle: [
    { over: 0, upTo: 12_400, rate: 0.10, base: 0 },
    { over: 12_400, upTo: 50_400, rate: 0.12, base: 1_240 },
    { over: 50_400, upTo: 105_700, rate: 0.22, base: 5_800 },
    { over: 105_700, upTo: 201_775, rate: 0.24, base: 17_966 },
    { over: 201_775, upTo: 256_225, rate: 0.32, base: 41_024 },
    { over: 256_225, upTo: 640_600, rate: 0.35, base: 58_448 },
    { over: 640_600, upTo: Infinity, rate: 0.37, base: 192_979.25 },
  ],
  bracketsMfs: [
    { over: 0, upTo: 12_400, rate: 0.10, base: 0 },
    { over: 12_400, upTo: 50_400, rate: 0.12, base: 1_240 },
    { over: 50_400, upTo: 105_700, rate: 0.22, base: 5_800 },
    { over: 105_700, upTo: 201_775, rate: 0.24, base: 17_966 },
    { over: 201_775, upTo: 256_225, rate: 0.32, base: 41_024 },
    { over: 256_225, upTo: 384_350, rate: 0.35, base: 58_448 },
    { over: 384_350, upTo: Infinity, rate: 0.37, base: 103_291.75 },
  ],

  // Rev. Proc. 2025-32 §4.14(1), (3).
  standardDeductionBase: {
    [FilingStatus.Single]: 16_100,
    [FilingStatus.MFJ]: 32_200,
    [FilingStatus.MFS]: 16_100,
    [FilingStatus.HOH]: 24_150,
    [FilingStatus.QSS]: 32_200,
  },
  standardDeductionAdditional: {
    [FilingStatus.Single]: 2_050,
    [FilingStatus.MFJ]: 1_650,
    [FilingStatus.MFS]: 1_650,
    [FilingStatus.HOH]: 2_050,
    [FilingStatus.QSS]: 1_650,
  },

  // 2026 draft Schedule 1-A Part V, lines 38–43.
  seniorDeductionMax: 6_000,
  seniorDeductionPhaseoutSingle: 75_000,
  seniorDeductionPhaseoutMfj: 150_000,
  seniorDeductionPhaseoutRate: 0.06,

  // Rev. Proc. 2025-32 §4.02 and §4.14(2).
  kiddieUnearnedIncomeThreshold: 1_350,
  kiddieStandardDeductionFloor: 1_350,

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
  // Pinned draft Form 8959, lines 5, 9 and 14; IRC §3101(b)(2).
  additionalMedicareThresholdMfj: 250_000,
  additionalMedicareThresholdMfs: 125_000,
  additionalMedicareThresholdOther: 200_000,

  // IRC §1411(b), as summarized in IRS Topic 559 (statutory, not indexed).
  niitThresholdMfj: 250_000,
  niitThresholdMfs: 125_000,
  niitThresholdOther: 200_000,

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

  // Rev. Proc. 2025-32 §4.05(1)–(2).
  ctcPerChild: 2_200,
  actcMaxPerChild: 1_700,
  // IRC §24(h)(3), (d)(1), and IRS CTC guidance; statutory limits unchanged.
  odcPerDependent: 500,
  ctcPhaseOutThresholdMfj: 400_000,
  ctcPhaseOutThresholdOther: 200_000,
  actcEarnedIncomeFloor: 2_500,

  // Notice 2025-67, pages 3–4, §25B retirement savings credit limits.
  // Per-person contribution cap: 2026 draft Form 8880, line 6.
  saversCreditContributionCap: 2_000,
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
  // Rev. Proc. 2026-15 §4.01(2), Tables 1–2; cars placed in service in 2026.
  luxuryAutoYear1NoBonus: 12_300,
  luxuryAutoYear1WithBonus: 20_300,
  luxuryAutoYear2: 19_800,
  luxuryAutoYear3: 11_900,
  luxuryAutoYear4Plus: 7_160,
  // Pinned 2026 draft Schedule H, questions A and C.
  householdFicaThreshold: 3_000,
  householdFutaQuarterlyThreshold: 1_000,
  // Pinned 2026 draft Schedule A, line 5e.
  saltCap: 40_400,
  saltPhaseoutThreshold: 505_000,
  saltPhaseoutThresholdMfs: 252_500,
  // P.L. 119-21 §68(b)(5)(B); IRS 2026 Form 1040-ES SALT correction.
  saltPhaseoutRate: 0.30,
  saltFloor: 10_000,
  saltFloorMfs: 5_000,

  // 2025 HHS poverty guideline tables: TY2026 Form 8962 uses prior-year FPL.
  fplBase: 15_650,
  fplIncrement: 5_500,
  fplAlaskaBase: 19_550,
  fplAlaskaIncrement: 6_880,
  fplHawaiiBase: 17_990,
  fplHawaiiIncrement: 6_330,

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

  // Pinned 2026 draft Form 4972, lines 12–16 and page 4 instructions.
  mdaMax: 10_000,
  mdaPhaseOutThreshold: 20_000,
  mdaZeroThreshold: 70_000,
  deathBenefitMax: 5_000,

  // Pinned 2026 draft Form 8396, line 3 instructions, and Schedule B Part III.
  mccMaxCreditHighRate: 2_000,
  scheduleBDividendThreshold: 1_500,
} satisfies Pick<F1040Config, IndexedKeys>;
