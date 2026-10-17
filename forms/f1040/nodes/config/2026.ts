/**
 * TY2026 tax constants.
 *
 * "RP §x" is Rev. Proc. 2025-32 section x (the 2026 inflation adjustments,
 * reflecting P.L. 119-21, the OBBBA). "N 25-67" is Notice 2025-67 (2026
 * retirement limits). Statutory amounts that are not indexed cite the Code.
 */

import { FilingStatus } from "../types.ts";
import type { Bracket } from "./2025.ts";
import type { F1040Config } from "./types.ts";

// RP §4.01, Tables 1-4.
export const BRACKETS_MFJ_2026: ReadonlyArray<Bracket> = [
  { over: 0, upTo: 24_800, rate: 0.10, base: 0 },
  { over: 24_800, upTo: 100_800, rate: 0.12, base: 2_480 },
  { over: 100_800, upTo: 211_400, rate: 0.22, base: 11_600 },
  { over: 211_400, upTo: 403_550, rate: 0.24, base: 35_932 },
  { over: 403_550, upTo: 512_450, rate: 0.32, base: 82_048 },
  { over: 512_450, upTo: 768_700, rate: 0.35, base: 116_896 },
  { over: 768_700, upTo: Infinity, rate: 0.37, base: 206_583.50 },
];

export const BRACKETS_HOH_2026: ReadonlyArray<Bracket> = [
  { over: 0, upTo: 17_700, rate: 0.10, base: 0 },
  { over: 17_700, upTo: 67_450, rate: 0.12, base: 1_770 },
  { over: 67_450, upTo: 105_700, rate: 0.22, base: 7_740 },
  { over: 105_700, upTo: 201_750, rate: 0.24, base: 16_155 },
  { over: 201_750, upTo: 256_200, rate: 0.32, base: 39_207 },
  { over: 256_200, upTo: 640_600, rate: 0.35, base: 56_631 },
  { over: 640_600, upTo: Infinity, rate: 0.37, base: 191_171 },
];

export const BRACKETS_SINGLE_2026: ReadonlyArray<Bracket> = [
  { over: 0, upTo: 12_400, rate: 0.10, base: 0 },
  { over: 12_400, upTo: 50_400, rate: 0.12, base: 1_240 },
  { over: 50_400, upTo: 105_700, rate: 0.22, base: 5_800 },
  { over: 105_700, upTo: 201_775, rate: 0.24, base: 17_966 },
  { over: 201_775, upTo: 256_225, rate: 0.32, base: 41_024 },
  { over: 256_225, upTo: 640_600, rate: 0.35, base: 58_448 },
  { over: 640_600, upTo: Infinity, rate: 0.37, base: 192_979.25 },
];

export const BRACKETS_MFS_2026: ReadonlyArray<Bracket> = [
  { over: 0, upTo: 12_400, rate: 0.10, base: 0 },
  { over: 12_400, upTo: 50_400, rate: 0.12, base: 1_240 },
  { over: 50_400, upTo: 105_700, rate: 0.22, base: 5_800 },
  { over: 105_700, upTo: 201_775, rate: 0.24, base: 17_966 },
  { over: 201_775, upTo: 256_225, rate: 0.32, base: 41_024 },
  { over: 256_225, upTo: 384_350, rate: 0.35, base: 58_448 },
  { over: 384_350, upTo: Infinity, rate: 0.37, base: 103_291.75 },
];

function byStatus(
  single: number,
  mfj: number,
  mfs: number,
  hoh: number,
  qss: number,
): Record<FilingStatus, number> {
  return {
    [FilingStatus.Single]: single,
    [FilingStatus.MFJ]: mfj,
    [FilingStatus.MFS]: mfs,
    [FilingStatus.HOH]: hoh,
    [FilingStatus.QSS]: qss,
  };
}

export const config2026: F1040Config = {
  bracketsMfj: BRACKETS_MFJ_2026,
  bracketsSingle: BRACKETS_SINGLE_2026,
  bracketsHoh: BRACKETS_HOH_2026,
  bracketsMfs: BRACKETS_MFS_2026,
  // RP §4.14(1) and (3): $2,050 for unmarried (single, HOH), $1,650 otherwise.
  standardDeductionBase: byStatus(16_100, 32_200, 16_100, 24_150, 32_200),
  standardDeductionAdditional: byStatus(2_050, 1_650, 1_650, 2_050, 1_650),
  // IRC §151(d)(5)(C), added by P.L. 119-21 §70103 for 2025-2028; not indexed.
  seniorDeductionMax: 6_000,
  seniorDeductionPhaseoutSingle: 75_000,
  seniorDeductionPhaseoutMfj: 150_000,
  seniorDeductionPhaseoutRate: 0.06,
  // RP §4.03: maximum zero-rate and maximum 15%-rate amounts.
  qdcgtZeroCeiling: byStatus(49_450, 98_900, 49_450, 66_200, 98_900),
  qdcgtTwentyFloor: byStatus(545_500, 613_700, 306_850, 579_600, 613_700),
  // RP §4.10. Phaseout thresholds reset by P.L. 119-21 §70107.
  amtExemption: byStatus(90_100, 140_200, 70_100, 90_100, 140_200),
  amtPhaseOutStart: byStatus(500_000, 1_000_000, 500_000, 500_000, 1_000_000),
  amtBracket26ThresholdStandard: 244_500,
  amtBracket26ThresholdMfs: 122_250,
  // IRC §55(b)(1)(A): 2% of the 28% thresholds above.
  amtBracketAdjustmentStandard: 4_890,
  amtBracketAdjustmentMfs: 2_445,
  // IRS Topic 751: 2026 Social Security wage base; 6.2% under IRC §3101(a).
  ssWageBase: 184_500,
  ssTaxPerEmployer: 11_439,
  // IRC §3101(b)(2) and §1411(b); not indexed.
  additionalMedicareThresholdMfj: 250_000,
  additionalMedicareThresholdMfs: 125_000,
  additionalMedicareThresholdOther: 200_000,
  niitThresholdMfj: 250_000,
  niitThresholdMfs: 125_000,
  niitThresholdOther: 200_000,
  // Rev. Proc. 2025-19 §.01; catch-up IRC §223(b)(3)(B), not indexed.
  hsaSelfOnlyLimit: 4_400,
  hsaFamilyLimit: 8_750,
  hsaCatchup: 1_000,
  // N 25-67: $7,500 limit, $1,100 age-50 catch-up, §219(g) phaseout ranges.
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
  // RP §4.26. The joint phase-in range is $553,500 - $403,500 (P.L. 119-21
  // §70105). RP lists $201,775 for MFS; the config's single field holds the
  // $201,750 "all other returns" amount.
  qbiThresholdSingle: 201_750,
  qbiThresholdMfj: 403_500,
  qbiPhaseInRange: 150_000,
  // RP §4.06(2).
  eitcInvestmentIncomeLimit: 12_200,
  // RP §4.05; ODC IRC §24(h)(4); phaseout §24(h)(3); ACTC floor §24(h)(6).
  ctcPerChild: 2_200,
  odcPerDependent: 500,
  actcMaxPerChild: 1_700,
  ctcPhaseOutThresholdMfj: 400_000,
  ctcPhaseOutThresholdOther: 200_000,
  actcEarnedIncomeFloor: 2_500,
  // N 25-67 (§25B(b) AGI limits); $2,000 cap IRC §25B(a).
  saversCreditContributionCap: 2_000,
  saversCreditAgiSingle: { rate50: 24_250, rate20: 26_250, rate10: 40_250 },
  saversCreditAgiHoh: { rate50: 36_375, rate20: 39_375, rate10: 60_375 },
  saversCreditAgiMfj: { rate50: 48_500, rate20: 52_500, rate10: 80_500 },
  // RP §4.17.
  savingsBondPhaseoutStartMfj: 152_650,
  savingsBondPhaseoutEndMfj: 182_650,
  savingsBondPhaseoutStartSingle: 101_800,
  savingsBondPhaseoutEndSingle: 116_800,
  // RP §4.02: $1,350; the §1(g)(4)(A)(ii) threshold is twice that amount.
  kiddieUnearnedIncomeThreshold: 2_700,
  kiddieStandardDeductionFloor: 1_350,
  // RP §4.39; housing base is 16% of the exclusion, IRC §911(c)(1)(B)(i).
  feieLimit: 132_900,
  feieHousingBase: 21_264,
  // RP §4.24; Rev. Proc. 2026-15 Tables 1-2. The third-year limit is $11,900
  // and each succeeding year $7,160; this field holds the third-year amount.
  section179Limit: 2_560_000,
  section179PhaseoutThreshold: 4_090_000,
  luxuryAutoYear1NoBonus: 12_300,
  luxuryAutoYear1WithBonus: 20_300,
  luxuryAutoYear2: 19_800,
  luxuryAutoYear3Plus: 11_900,
  // MeF 2026v1.0 rules SH-F1040-008-11/009-11 ($3,000); FUTA IRC §3306(a)(3).
  householdFicaThreshold: 3_000,
  householdFutaQuarterlyThreshold: 1_000,
  // IRC §164(b)(7) (P.L. 119-21 §70120): 101% of the 2025 cap and threshold.
  saltCap: 40_400,
  saltPhaseoutThreshold: 505_000,
  saltPhaseoutThresholdMfs: 252_500,
  saltPhaseoutRate: 0.30,
  saltFloor: 10_000,
  saltFloorMfs: 5_000,
  // IRC §21(c) caps; §129(a)(2)(A) as amended by P.L. 119-21 §70404. The
  // 2026 credit percentage schedule (P.L. 119-21 §70405) is not a config value.
  depCareExpenseCapOne: 3_000,
  depCareExpenseCapTwoPlus: 6_000,
  depCareEmployerExclusion: 7_500,
  depCareEmployerExclusionMfs: 3_750,
  depCareCreditRateAgiThreshold: 15_000,
  depCareCreditRateBracketSize: 2_000,
  // 2025 HHS poverty guidelines (FR Doc. 2025-01377), used for 2026 coverage.
  fplBase: 15_650,
  fplIncrement: 5_500,
  // N 25-67 (§408(d)(8)); PSO IRC §402(l), not indexed.
  qcdAnnualLimit: 111_000,
  psoExclusionLimit: 3_000,
  // RP §4.31, §4.30.
  eblThresholdSingle: 256_000,
  eblThresholdMfj: 512_000,
  smallBizGrossReceipts: 32_000_000,
  // N 25-67: $24,500 deferral, $8,000 age-50 and $11,250 age 60-63 catch-up;
  // SIMPLE $17,000, $4,000 and $5,250.
  retirementLimits: {
    "401k": { 49: 24_500, 59: 32_500, 63: 35_750, [Infinity]: 32_500 },
    "403b": { 49: 24_500, 59: 32_500, 63: 35_750, [Infinity]: 32_500 },
    "457b": { 49: 24_500, 59: 32_500, 63: 35_750, [Infinity]: 32_500 },
    "simple": { 49: 17_000, 59: 21_000, 63: 22_250, [Infinity]: 21_000 },
  },
  // RP §4.62.
  ltcPerDiemDailyLimit: 430,
  // IRC §402(e)(1)(C) and former §101(b) as preserved for Form 4972; not indexed.
  mdaMax: 10_000,
  mdaPhaseOutThreshold: 20_000,
  mdaZeroThreshold: 70_000,
  deathBenefitMax: 5_000,
  // IRC §108(h)(2).
  qpriCapStandard: 750_000,
  qpriCapMfs: 375_000,
  // Schedule B Part II threshold, unchanged.
  scheduleBDividendThreshold: 1_500,
  // RP §4.26 threshold amounts.
  sec199aSingleThreshold: 201_750,
  sec199aMfjThreshold: 403_500,
  // RP §4.29.
  sliPhaseOutStartSingle: 85_000,
  sliPhaseOutEndSingle: 100_000,
  sliPhaseOutStartMfj: 175_000,
  sliPhaseOutEndMfj: 205_000,
  // IRC §62(b)(1)(C); not indexed.
  f2106PerformingArtistAgiLimit: 16_000,
  // RP §4.27.
  ltcPremiumLimits: [
    { maxAge: 40, limit: 500 },
    { maxAge: 50, limit: 930 },
    { maxAge: 60, limit: 1_860 },
    { maxAge: 70, limit: 4_960 },
    { maxAge: Infinity, limit: 6_200 },
  ],
  // IRC §25(a)(2); not indexed.
  mccMaxCreditHighRate: 2_000,
  // IRC §404(a)(3) 25%; N 25-67 §415(c)(1)(A) $72,000; IRC §408(p)(2)(C)(ii) 3%.
  sepContributionRate: 0.25,
  sepMaxContribution: 72_000,
  simpleEmployerMatchRate: 0.03,
};
