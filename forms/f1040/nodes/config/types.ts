// forms/f1040/nodes/config/types.ts
import type { FilingStatus } from "../types.ts";
import type { Bracket } from "./2025.ts";

export interface F1040Config {
  // ── Tax brackets ──────────────────────────────────────────────────────────
  bracketsMfj: ReadonlyArray<Bracket>;
  bracketsSingle: ReadonlyArray<Bracket>;
  bracketsHoh: ReadonlyArray<Bracket>;
  bracketsMfs: ReadonlyArray<Bracket>;

  // ── Standard deduction ────────────────────────────────────────────────────
  standardDeductionBase: Record<FilingStatus, number>;
  standardDeductionAdditional: Record<FilingStatus, number>;

  // ── Senior deduction (OBBBA §70302) ───────────────────────────────────────
  seniorDeductionMax: number;
  seniorDeductionPhaseoutSingle: number;
  seniorDeductionPhaseoutMfj: number;
  seniorDeductionPhaseoutRate: number;

  // ── QDCGT thresholds ──────────────────────────────────────────────────────
  qdcgtZeroCeiling: Record<FilingStatus, number>;
  qdcgtTwentyFloor: Record<FilingStatus, number>;

  // ── AMT ───────────────────────────────────────────────────────────────────
  amtExemption: Record<FilingStatus, number>;
  amtPhaseOutStart: Record<FilingStatus, number>;
  amtBracket26ThresholdStandard: number;
  amtBracket26ThresholdMfs: number;
  amtBracketAdjustmentStandard: number;
  amtBracketAdjustmentMfs: number;

  // ── FICA / Social Security ────────────────────────────────────────────────
  ssWageBase: number;
  ssTaxPerEmployer: number;
  additionalMedicareThresholdMfj: number;
  additionalMedicareThresholdMfs: number;
  additionalMedicareThresholdOther: number;

  // ── NIIT ──────────────────────────────────────────────────────────────────
  niitThresholdMfj: number;
  niitThresholdMfs: number;
  niitThresholdOther: number;

  // ── HSA ───────────────────────────────────────────────────────────────────
  hsaSelfOnlyLimit: number;
  hsaFamilyLimit: number;
  hsaCatchup: number;

  // ── IRA ───────────────────────────────────────────────────────────────────
  iraContributionLimit: number;
  iraContributionLimitAge50: number;
  iraPhaseoutSingleLower: number;
  iraPhaseoutSingleUpper: number;
  iraPhaseoutMfjLower: number;
  iraPhaseoutMfjUpper: number;
  iraPhaseoutNoncoveredMfjLower: number;
  iraPhaseoutNoncoveredMfjUpper: number;
  iraPhaseoutMfsLower: number;
  iraPhaseoutMfsUpper: number;

  // ── QBI ───────────────────────────────────────────────────────────────────
  qbiThresholdSingle: number;
  qbiThresholdMfj: number;
  qbiPhaseInRange: number;

  // ── EITC ──────────────────────────────────────────────────────────────────
  eitcMaxCredit: Record<number, number>;
  eitcPhaseInEnd: Record<number, number>;
  eitcPhaseoutStart: Record<number, [number, number]>;
  eitcIncomeLimit: Record<number, [number, number]>;
  eitcInvestmentIncomeLimit: number;

  // ── CTC / ACTC ────────────────────────────────────────────────────────────
  ctcPerChild: number;
  odcPerDependent: number;
  actcMaxPerChild: number;
  ctcPhaseOutThresholdMfj: number;
  ctcPhaseOutThresholdOther: number;
  actcEarnedIncomeFloor: number;

  // ── Saver's Credit ────────────────────────────────────────────────────────
  saversCreditContributionCap: number;
  saversCreditAgiSingle: { rate50: number; rate20: number; rate10: number };
  saversCreditAgiHoh:    { rate50: number; rate20: number; rate10: number };
  saversCreditAgiMfj:    { rate50: number; rate20: number; rate10: number };

  // ── Savings Bonds (8815) ──────────────────────────────────────────────────
  savingsBondPhaseoutStartMfj: number;
  savingsBondPhaseoutEndMfj: number;
  savingsBondPhaseoutStartSingle: number;
  savingsBondPhaseoutEndSingle: number;

  // ── Kiddie Tax (8615) ─────────────────────────────────────────────────────
  kiddieUnearnedIncomeThreshold: number;
  kiddieStandardDeductionFloor: number;

  // ── FEIE (2555) ───────────────────────────────────────────────────────────
  feieLimit: number;
  feieHousingBase: number;

  // ── Section 179 / Depreciation (4562) ────────────────────────────────────
  section179Limit: number;
  section179PhaseoutThreshold: number;
  luxuryAutoYear1NoBonus: number;
  luxuryAutoYear1WithBonus: number;
  luxuryAutoYear2: number;
  luxuryAutoYear3Plus: number;

  // ── Household Employment (Schedule H) ─────────────────────────────────────
  householdFicaThreshold: number;
  householdFutaQuarterlyThreshold: number;

  // ── SALT (Schedule A) ─────────────────────────────────────────────────────
  saltCap: number;
  saltPhaseoutThreshold: number;
  saltPhaseoutThresholdMfs: number;
  saltPhaseoutRate: number;
  saltFloor: number;
  saltFloorMfs: number;

  // ── Dependent Care (2441) ─────────────────────────────────────────────────
  depCareExpenseCapOne: number;
  depCareExpenseCapTwoPlus: number;
  depCareEmployerExclusion: number;
  depCareEmployerExclusionMfs: number;
  depCareCreditRateAgiThreshold: number;
  depCareCreditRateBracketSize: number;

  // ── ACA Premium Tax Credit (8962) ─────────────────────────────────────────
  fplBase: number;
  fplIncrement: number;

  // ── IRA Distributions (1099-R) ───────────────────────────────────────────
  qcdAnnualLimit: number;
  psoExclusionLimit: number;

  // ── Excess Business Loss (Schedule C / F) ─────────────────────────────────
  eblThresholdSingle: number;
  eblThresholdMfj: number;

  // ── §163(j) Interest Limitation (8990) ───────────────────────────────────
  smallBizGrossReceipts: number;

  // ── Retirement Plan Limits (W-2) ──────────────────────────────────────────
  retirementLimits: Record<string, Record<number, number>>;

  // ── LTC Per-Diem (8853) ───────────────────────────────────────────────────
  ltcPerDiemDailyLimit: number;

  // ── MDA / Lump-Sum Distributions (4972) ───────────────────────────────────
  mdaMax: number;
  mdaPhaseOutThreshold: number;
  mdaZeroThreshold: number;
  deathBenefitMax: number;

  // ── QPRI Exclusion (982) ──────────────────────────────────────────────────
  qpriCapStandard: number;
  qpriCapMfs: number;

  // ── 1099-DIV / Schedule B routing ─────────────────────────────────────────
  scheduleBDividendThreshold: number;
  sec199aSingleThreshold: number;
  sec199aMfjThreshold: number;

  // ── Student Loan Interest Phase-Out ───────────────────────────────────────
  sliPhaseOutStartSingle: number;
  sliPhaseOutEndSingle: number;
  sliPhaseOutStartMfj: number;
  sliPhaseOutEndMfj: number;

  // ── Form 2106 ─────────────────────────────────────────────────────────────
  f2106PerformingArtistAgiLimit: number;

  // ── LTC Premium Limits (ltc_premium, 7206) ────────────────────────────────
  ltcPremiumLimits: ReadonlyArray<{ readonly maxAge: number; readonly limit: number }>;

  // ── Mortgage Interest Credit (8396) ──────────────────────────────────────
  mccMaxCreditHighRate: number;

  // ── SEP / SIMPLE ──────────────────────────────────────────────────────────
  sepContributionRate: number;
  sepMaxContribution: number;
  simpleEmployerMatchRate: number;
}
