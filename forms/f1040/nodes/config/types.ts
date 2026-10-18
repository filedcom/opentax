// forms/f1040/nodes/config/types.ts
import type { FilingStatus } from "../types.ts";
import type { Bracket } from "./2025.ts";

/** IRC §32(b) amounts for one qualifying-child count. */
export type EitcParameters = {
  readonly creditRate: number;
  readonly phaseoutRate: number;
  readonly earnedIncomeAmount: number;
  readonly maxCredit: number;
  readonly phaseoutStart: number;
  readonly phaseoutStartMfj: number;
  readonly phaseoutEnd: number;
  readonly phaseoutEndMfj: number;
};

/** Standard mileage rates in dollars per mile, from `from` (ISO date) on. */
export type MileagePeriod = {
  readonly from: string;
  readonly business: number;
  readonly medicalMoving: number;
  readonly charitable: number;
};

/** IRC §21(a)(2)(B) as amended for 2026: the second applicable-percentage step. */
export type DepCareSecondPhaseout = {
  readonly agiThreshold: number;
  readonly agiThresholdMfj: number;
  readonly bracketSize: number;
  readonly bracketSizeMfj: number;
  readonly floorRate: number;
};

/** IRC §36B(b)(3)(A) applicable percentage band, in hundredths of a percent. */
export type PtcApplicablePercentageBand = {
  /** Household income as a percentage of the FPL: at least this. */
  readonly fromFplPct: number;
  /** Less than this; the last band includes it. */
  readonly toFplPct: number;
  readonly initial: number;
  readonly final: number;
};

/** IRC §36B(f)(2)(B) repayment limitation below `maxFplPct`. */
export type PtcRepaymentCap = {
  readonly maxFplPct: number;
  readonly singleCap: number;
  readonly otherCap: number;
};

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

  // ── Schedule SE optional methods ─────────────────────────────────────────
  /** Part II line 14: maximum income for the optional methods. */
  seOptionalMethodMaximum: number;
  /**
   * The farm optional method is available when gross farm income is at most
   * the first amount or net farm profits are below the second.
   */
  seFarmOptionalGrossIncomeLimit: number;
  seFarmOptionalNetProfitLimit: number;

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
  /** Section 199A phase-in range for joint returns; other statuses use half. */
  qbiPhaseInRange: number;

  // ── EITC ──────────────────────────────────────────────────────────────────
  eitcInvestmentIncomeLimit: number;
  /** Indexed by qualifying children: 0, 1, 2, 3 or more. */
  eitcByChildren: readonly [
    EitcParameters,
    EitcParameters,
    EitcParameters,
    EitcParameters,
  ];

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
  saversCreditAgiHoh: { rate50: number; rate20: number; rate10: number };
  saversCreditAgiMfj: { rate50: number; rate20: number; rate10: number };

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
  /** Third recovery year; later years use `luxuryAutoSucceedingYears`. */
  luxuryAutoYear3Plus: number;
  luxuryAutoSucceedingYears: number;

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
  depCareCreditMaxRate: number;
  /** Floor of the first reduction step. */
  depCareCreditFirstFloorRate: number;
  /** null when the year has a single reduction step. */
  depCareCreditSecondPhaseout: DepCareSecondPhaseout | null;

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
  ltcPremiumLimits: ReadonlyArray<
    { readonly maxAge: number; readonly limit: number }
  >;

  // ── Mortgage Interest Credit (8396) ──────────────────────────────────────
  mccMaxCreditHighRate: number;

  // ── SEP / SIMPLE ──────────────────────────────────────────────────────────
  sepContributionRate: number;
  sepMaxContribution: number;
  simpleEmployerMatchRate: number;

  // ── Schedule 1-A: tips, overtime, vehicle loan interest ──────────────────
  qualifiedTipsCap: number;
  qualifiedOvertimeCap: number;
  qualifiedOvertimeCapMfj: number;
  tipsOvertimePhaseoutThreshold: number;
  tipsOvertimePhaseoutThresholdMfj: number;
  /** Reduction per whole $1,000 of MAGI over the threshold. */
  tipsOvertimePhaseoutPerThousand: number;
  vehicleLoanInterestCap: number;
  vehicleLoanInterestPhaseoutThreshold: number;
  vehicleLoanInterestPhaseoutThresholdMfj: number;
  /** Reduction per $1,000 or portion of MAGI over the threshold. */
  vehicleLoanInterestPhaseoutPerThousand: number;

  // ── Charitable and itemized-deduction limits ─────────────────────────────
  /** 1040 line 12f; zero when the year has no non-itemizer deduction. */
  nonitemizerCharitableLimit: number;
  nonitemizerCharitableLimitMfj: number;
  /** Share of the contribution base disallowed under IRC §170(b)(1)(I). */
  charitableAgiFloorRate: number;
  /** IRC §68(a) reduction fraction; zero when §68 does not apply. */
  itemizedDeductionReductionRate: number;
  /** IRC §163(h)(3)(E): mortgage insurance premiums as residence interest. */
  mortgageInsurancePremiumsDeductible: boolean;

  // ── QBI minimum deduction (IRC §199A(i)) ─────────────────────────────────
  qbiMinimumDeduction: number;
  qbiMinimumDeductionQbiFloor: number;

  // ── Adoption (8839) ──────────────────────────────────────────────────────
  adoptionCreditMax: number;
  adoptionCreditRefundableMax: number;
  adoptionPhaseoutStart: number;
  adoptionPhaseoutRange: number;

  // ── Dependents and educators ─────────────────────────────────────────────
  qualifyingRelativeGrossIncomeLimit: number;
  dependentStandardDeductionFloor: number;
  dependentStandardDeductionEarnedIncomeAddOn: number;
  educatorExpenseLimit: number;

  // ── Standard mileage rates ───────────────────────────────────────────────
  /** Ordered by `from`; a rate applies to miles driven from that date. */
  standardMileageRates: ReadonlyArray<MileagePeriod>;

  // ── Trump accounts (IRC §§128, 530A) ─────────────────────────────────────
  trumpAccountContributionLimit: number;
  trumpAccountEmployerExclusionLimit: number;

  // ── Taxes and payments ───────────────────────────────────────────────────
  /** AMT exemption reduction per dollar of AMTI over the phase-out start. */
  amtExemptionPhaseOutRate: number;
  /** Form 8962 Tables 1-1 (`fplBase`), 1-2 Alaska and 1-3 Hawaii. */
  fplBaseAlaska: number;
  fplIncrementAlaska: number;
  fplBaseHawaii: number;
  fplIncrementHawaii: number;
  ptcApplicablePercentages: ReadonlyArray<PtcApplicablePercentageBand>;
  /** Household income above this FPL percentage gets no PTC; null if none. */
  ptcIncomeLimitFplPct: number | null;
  /** IRC §36B(c)(2)(C)(i)(II); also the Pub. 974 QSEHRA affordability test. */
  ptcRequiredContributionPercentage: number;
  /** Empty when the year has no repayment limitation. */
  ptcRepaymentCaps: ReadonlyArray<PtcRepaymentCap>;
  /** IRC §36B(c)(1)(B): lawfully present individuals below 100% FPL. */
  ptcLawfullyPresentBelow100Fpl: boolean;
}
