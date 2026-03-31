/**
 * TY2025 Tax Constants — IRS Rev. Proc. 2024-40 (unless noted)
 *
 * All dollar amounts are in whole dollars unless noted.
 * All rates are decimals (e.g. 0.062 = 6.2%).
 *
 * Sections referenced below correspond to Rev. Proc. 2024-40 unless
 * another authority is cited explicitly.
 */

import { FilingStatus } from "../types.ts";

// ─── Tax Brackets ─────────────────────────────────────────────────────────────
// Rev. Proc. 2024-40, §3.01; IRC §1(a)–(d)

export type Bracket = { over: number; upTo: number; rate: number; base: number };

/** IRC §1(a) — Married Filing Jointly / Qualifying Surviving Spouse */
export const BRACKETS_MFJ_2025: ReadonlyArray<Bracket> = [
  { over: 0,       upTo: 23_850,   rate: 0.10, base: 0 },
  { over: 23_850,  upTo: 96_950,   rate: 0.12, base: 2_385 },
  { over: 96_950,  upTo: 206_700,  rate: 0.22, base: 11_157 },
  { over: 206_700, upTo: 394_600,  rate: 0.24, base: 35_302 },
  { over: 394_600, upTo: 501_050,  rate: 0.32, base: 80_398 },
  { over: 501_050, upTo: 751_600,  rate: 0.35, base: 114_462 },
  { over: 751_600, upTo: Infinity, rate: 0.37, base: 202_154.50 },
] as const;

/** IRC §1(c) — Single */
export const BRACKETS_SINGLE_2025: ReadonlyArray<Bracket> = [
  { over: 0,       upTo: 11_925,   rate: 0.10, base: 0 },
  { over: 11_925,  upTo: 48_475,   rate: 0.12, base: 1_192.50 },
  { over: 48_475,  upTo: 103_350,  rate: 0.22, base: 5_578.50 },
  { over: 103_350, upTo: 197_300,  rate: 0.24, base: 17_651 },
  { over: 197_300, upTo: 250_525,  rate: 0.32, base: 40_199 },
  { over: 250_525, upTo: 626_350,  rate: 0.35, base: 57_231 },
  { over: 626_350, upTo: Infinity, rate: 0.37, base: 188_769.75 },
] as const;

/** IRC §1(b) — Head of Household */
export const BRACKETS_HOH_2025: ReadonlyArray<Bracket> = [
  { over: 0,       upTo: 17_000,   rate: 0.10, base: 0 },
  { over: 17_000,  upTo: 64_850,   rate: 0.12, base: 1_700 },
  { over: 64_850,  upTo: 103_350,  rate: 0.22, base: 7_442 },
  { over: 103_350, upTo: 197_300,  rate: 0.24, base: 15_912 },
  { over: 197_300, upTo: 250_500,  rate: 0.32, base: 38_460 },
  { over: 250_500, upTo: 626_350,  rate: 0.35, base: 55_484 },
  { over: 626_350, upTo: Infinity, rate: 0.37, base: 187_031.50 },
] as const;

/** IRC §1(d) — Married Filing Separately */
export const BRACKETS_MFS_2025: ReadonlyArray<Bracket> = [
  { over: 0,       upTo: 11_925,   rate: 0.10, base: 0 },
  { over: 11_925,  upTo: 48_475,   rate: 0.12, base: 1_192.50 },
  { over: 48_475,  upTo: 103_350,  rate: 0.22, base: 5_578.50 },
  { over: 103_350, upTo: 197_300,  rate: 0.24, base: 17_651 },
  { over: 197_300, upTo: 250_525,  rate: 0.32, base: 40_199 },
  { over: 250_525, upTo: 375_800,  rate: 0.35, base: 57_231 },
  { over: 375_800, upTo: Infinity, rate: 0.37, base: 101_077.25 },
] as const;

// ─── Standard Deduction ───────────────────────────────────────────────────────
// Rev. Proc. 2024-40, §3.14; IRC §63(c)

/** Base standard deduction by filing status (TY2025). */
export const STANDARD_DEDUCTION_BASE_2025: Record<FilingStatus, number> = {
  [FilingStatus.Single]: 15_000,
  [FilingStatus.MFJ]:    30_000,
  [FilingStatus.MFS]:    15_000,
  [FilingStatus.HOH]:    22_500,
  [FilingStatus.QSS]:    30_000,
} as const;

/**
 * Additional standard deduction per age/blindness factor (TY2025).
 * Single/HOH: $1,600 per factor; MFJ/MFS/QSS: $1,350 per factor.
 * IRC §63(f); Rev. Proc. 2024-40, §3.14
 */
export const STANDARD_DEDUCTION_ADDITIONAL_2025: Record<FilingStatus, number> = {
  [FilingStatus.Single]: 1_600,
  [FilingStatus.MFJ]:    1_350,
  [FilingStatus.MFS]:    1_350,
  [FilingStatus.HOH]:    1_600,
  [FilingStatus.QSS]:    1_350,
} as const;

// ─── QDCGT / Capital Gains Rate Thresholds ────────────────────────────────────
// Rev. Proc. 2024-40, §3.02; IRC §1(h)

/** Top of 0% LTCG/QD bracket (income at or below this → 0% rate). */
export const QDCGT_ZERO_CEILING_2025: Record<FilingStatus, number> = {
  [FilingStatus.Single]: 48_350,
  [FilingStatus.MFJ]:    96_700,
  [FilingStatus.MFS]:    48_350,
  [FilingStatus.HOH]:    64_750,
  [FilingStatus.QSS]:    96_700,
} as const;

/** Bottom of 20% LTCG/QD bracket (income above this → 20% rate). */
export const QDCGT_TWENTY_FLOOR_2025: Record<FilingStatus, number> = {
  [FilingStatus.Single]: 533_400,
  [FilingStatus.MFJ]:    600_050,
  [FilingStatus.MFS]:    300_025,
  [FilingStatus.HOH]:    566_700,
  [FilingStatus.QSS]:    600_050,
} as const;

// ─── AMT — Form 6251 ──────────────────────────────────────────────────────────
// IRS Instructions for Form 6251 (2025); IRC §55(d)

/** AMT exemption amounts by filing status (TY2025). */
export const AMT_EXEMPTION_2025: Record<FilingStatus, number> = {
  [FilingStatus.Single]: 88_100,
  [FilingStatus.HOH]:    88_100,
  [FilingStatus.MFJ]:    137_000,
  [FilingStatus.QSS]:    137_000,
  [FilingStatus.MFS]:    68_500,
} as const;

/** AMT phase-out start thresholds by filing status (TY2025). */
export const AMT_PHASE_OUT_START_2025: Record<FilingStatus, number> = {
  [FilingStatus.Single]: 626_350,
  [FilingStatus.HOH]:    626_350,
  [FilingStatus.MFJ]:    1_252_700,
  [FilingStatus.QSS]:    1_252_700,
  [FilingStatus.MFS]:    626_350,
} as const;

/**
 * AMT 26%/28% bracket threshold — standard (non-MFS) filers.
 * Form 6251 Line 7 instructions; IRC §55(b)(1)
 */
export const AMT_BRACKET_26_THRESHOLD_STANDARD_2025 = 239_100;

/**
 * AMT 26%/28% bracket threshold — MFS filers (= standard / 2).
 * Form 6251 Line 7 instructions
 */
export const AMT_BRACKET_26_THRESHOLD_MFS_2025 = 119_550;

/**
 * Pre-computed savings adjustment for standard filers in the 28% bracket.
 * = 239,100 × (0.28 − 0.26) = 4,782
 */
export const AMT_BRACKET_ADJUSTMENT_STANDARD_2025 = 4_782;

/**
 * Pre-computed savings adjustment for MFS filers in the 28% bracket.
 * = 119,550 × (0.28 − 0.26) = 2,391
 */
export const AMT_BRACKET_ADJUSTMENT_MFS_2025 = 2_391;

// ─── FICA / Social Security ───────────────────────────────────────────────────
// Rev. Proc. 2024-40, §3.28; IRC §3121(a)(1)

/** Social Security wage base (TY2025). */
export const SS_WAGE_BASE_2025 = 176_100;

/**
 * Maximum SS tax per employer (= SS_WAGE_BASE_2025 × 0.062).
 * Used to compute excess SS withheld when taxpayer has multiple employers.
 */
export const SS_MAX_TAX_PER_EMPLOYER_2025 = 10_918.20;

// ─── Additional Medicare Tax (Form 8959) ─────────────────────────────────────
// IRC §3101(b)(2); not indexed for inflation

/** Additional Medicare Tax threshold — MFJ/QSS. */
export const ADDITIONAL_MEDICARE_THRESHOLD_MFJ = 250_000;

/** Additional Medicare Tax threshold — MFS. */
export const ADDITIONAL_MEDICARE_THRESHOLD_MFS = 125_000;

/** Additional Medicare Tax threshold — Single, HOH, QSS. */
export const ADDITIONAL_MEDICARE_THRESHOLD_OTHER = 200_000;

// ─── Net Investment Income Tax (Form 8960) ────────────────────────────────────
// IRC §1411; not indexed for inflation
// Thresholds are identical to Form 8959 — re-exported for clarity.

/** NIIT MAGI threshold — MFJ/QSS. */
export const NIIT_THRESHOLD_MFJ = 250_000;

/** NIIT MAGI threshold — MFS. */
export const NIIT_THRESHOLD_MFS = 125_000;

/** NIIT MAGI threshold — Single, HOH. */
export const NIIT_THRESHOLD_OTHER = 200_000;

// ─── HSA Contribution Limits (Form 8889) ─────────────────────────────────────
// Rev. Proc. 2024-25; IRC §223(b)(2)–(3)

/** HSA self-only HDHP contribution limit (TY2025). */
export const HSA_SELF_ONLY_LIMIT_2025 = 4_300;

/** HSA family HDHP contribution limit (TY2025). */
export const HSA_FAMILY_LIMIT_2025 = 8_550;

/** HSA catch-up contribution for age 55+ (statutory; not indexed). */
export const HSA_CATCHUP_2025 = 1_000;

// ─── IRA Contribution Limits ──────────────────────────────────────────────────
// Rev. Proc. 2024-40, §3.19; IRC §219(b)(5)(A)

/** Traditional/Roth IRA contribution limit under age 50 (TY2025). */
export const IRA_CONTRIBUTION_LIMIT_2025 = 7_000;

/** Traditional/Roth IRA contribution limit age 50+ (TY2025). */
export const IRA_CONTRIBUTION_LIMIT_AGE50_2025 = 8_000;

/** IRA deduction phase-out — Single/HOH/QSS active participant, lower bound. */
export const IRA_PHASEOUT_SINGLE_LOWER_2025 = 79_000;

/** IRA deduction phase-out — Single/HOH/QSS active participant, upper bound. */
export const IRA_PHASEOUT_SINGLE_UPPER_2025 = 89_000;

/** IRA deduction phase-out — MFJ covered taxpayer, lower bound. */
export const IRA_PHASEOUT_MFJ_LOWER_2025 = 126_000;

/** IRA deduction phase-out — MFJ covered taxpayer, upper bound. */
export const IRA_PHASEOUT_MFJ_UPPER_2025 = 146_000;

/** IRA deduction phase-out — MFJ non-covered spouse (covered spouse), lower bound. */
export const IRA_PHASEOUT_NONCOVERED_MFJ_LOWER_2025 = 236_000;

/** IRA deduction phase-out — MFJ non-covered spouse (covered spouse), upper bound. */
export const IRA_PHASEOUT_NONCOVERED_MFJ_UPPER_2025 = 246_000;

/** IRA deduction phase-out — MFS active participant, lower bound. */
export const IRA_PHASEOUT_MFS_LOWER_2025 = 0;

/** IRA deduction phase-out — MFS active participant, upper bound. */
export const IRA_PHASEOUT_MFS_UPPER_2025 = 10_000;

// ─── QBI Deduction Thresholds (Form 8995A) ────────────────────────────────────
// Rev. Proc. 2024-40, §3.24; IRC §199A(b)(3)(B)(ii)

/** QBI wage limitation phase-in threshold — Single/MFS/HOH/QSS (TY2025). */
export const QBI_THRESHOLD_SINGLE_2025 = 197_300;

/** QBI wage limitation phase-in threshold — MFJ (TY2025). */
export const QBI_THRESHOLD_MFJ_2025 = 394_600;

/** QBI phase-in range width (same for all filing statuses). IRC §199A(b)(3)(B)(ii) */
export const QBI_PHASE_IN_RANGE_2025 = 100_000;

// ─── EITC (Earned Income Tax Credit) ─────────────────────────────────────────
// Rev. Proc. 2024-40, §3.11; IRC §32

/** EITC maximum credit amounts by number of qualifying children (0–3). */
export const EITC_MAX_CREDIT_2025: Record<number, number> = {
  0: 649,
  1: 4_328,
  2: 7_152,
  3: 8_046,
} as const;

/** EITC earned income at which phase-in ends (credit reaches maximum). */
export const EITC_PHASE_IN_END_2025: Record<number, number> = {
  0: 8_490,
  1: 12_730,
  2: 17_880,
  3: 17_880,
} as const;

/**
 * EITC phase-out start by children count: [single/hoh/mfs threshold, mfj/qss threshold].
 */
export const EITC_PHASEOUT_START_2025: Record<number, [number, number]> = {
  0: [9_524,  16_810],
  1: [21_560, 28_845],
  2: [21_560, 28_845],
  3: [21_560, 28_845],
} as const;

/**
 * EITC income limit (disqualifying income) by children count:
 * [single/hoh/mfs limit, mfj/qss limit].
 */
export const EITC_INCOME_LIMIT_2025: Record<number, [number, number]> = {
  0: [18_591, 25_511],
  1: [49_084, 56_004],
  2: [55_768, 62_688],
  3: [59_899, 66_819],
} as const;

/** EITC investment income limit — disqualifies any EITC when exceeded. */
export const EITC_INVESTMENT_INCOME_LIMIT_2025 = 11_950;

// ─── Child Tax Credit / ACTC (Form 8812) ─────────────────────────────────────
// P.L. 119-21 ("One Big Beautiful Bill Act"), enacted July 4, 2025

/** Child Tax Credit per qualifying child (TY2025, OBBBA). */
export const CTC_PER_CHILD_2025 = 2_200;

/** Other Dependent Credit per non-child dependent (TY2025). */
export const ODC_PER_DEPENDENT_2025 = 500;

/** Additional Child Tax Credit maximum per child (TY2025, OBBBA). */
export const ACTC_MAX_PER_CHILD_2025 = 1_700;

/** CTC phase-out threshold — MFJ (TY2025). */
export const CTC_PHASE_OUT_THRESHOLD_MFJ_2025 = 400_000;

/** CTC phase-out threshold — all other filing statuses (TY2025). */
export const CTC_PHASE_OUT_THRESHOLD_OTHER_2025 = 200_000;

/** ACTC earned income floor (minimum earned income for ACTC). */
export const ACTC_EARNED_INCOME_FLOOR_2025 = 2_500;

// ─── Saver's Credit (Form 8880) ───────────────────────────────────────────────
// Rev. Proc. 2024-40, §3.43; IRC §25B

/** Maximum contribution eligible for Saver's Credit per person. */
export const SAVERS_CREDIT_CONTRIBUTION_CAP_2025 = 2_000;

/** Saver's Credit AGI thresholds — Single/MFS/QSS: [50% rate, 20% rate, 10% rate]. */
export const SAVERS_CREDIT_AGI_SINGLE_2025 = { rate50: 23_000, rate20: 25_000, rate10: 38_250 } as const;

/** Saver's Credit AGI thresholds — HOH. */
export const SAVERS_CREDIT_AGI_HOH_2025 = { rate50: 34_500, rate20: 37_500, rate10: 57_375 } as const;

/** Saver's Credit AGI thresholds — MFJ. */
export const SAVERS_CREDIT_AGI_MFJ_2025 = { rate50: 46_000, rate20: 50_000, rate10: 76_500 } as const;

// ─── EE/I Bond Interest Exclusion (Form 8815) ────────────────────────────────
// Rev. Proc. 2024-40, §3.23; IRC §135(b)(2)(A)

/** Form 8815 phase-out start — MFJ/QSS. */
export const SAVINGS_BOND_PHASEOUT_START_MFJ_2025 = 145_200;

/** Form 8815 phase-out end — MFJ/QSS. */
export const SAVINGS_BOND_PHASEOUT_END_MFJ_2025 = 175_200;

/** Form 8815 phase-out start — Single/HOH. */
export const SAVINGS_BOND_PHASEOUT_START_SINGLE_2025 = 96_800;

/** Form 8815 phase-out end — Single/HOH. */
export const SAVINGS_BOND_PHASEOUT_END_SINGLE_2025 = 111_800;

// ─── Kiddie Tax (Form 8615) ───────────────────────────────────────────────────
// Rev. Proc. 2024-40, §3.10; IRC §1(g)

/** Net unearned income threshold for kiddie tax (TY2025). */
export const KIDDIE_TAX_UNEARNED_INCOME_THRESHOLD_2025 = 2_600;

/** Standard deduction floor for computing net unearned income (TY2025). */
export const KIDDIE_TAX_STANDARD_DEDUCTION_FLOOR_2025 = 1_300;

// ─── FEIE (Form 2555) ─────────────────────────────────────────────────────────
// Rev. Proc. 2024-40, §3.04; IRC §911(b)(2)

/** Foreign Earned Income Exclusion limit (TY2025). */
export const FEIE_LIMIT_2025 = 130_000;

// ─── Section 179 / Depreciation (Form 4562) ──────────────────────────────────
// P.L. 119-21 ("One Big Beautiful Bill Act"); IRC §179

/** Section 179 expensing limit (TY2025, OBBBA). */
export const SECTION_179_LIMIT_2025 = 2_500_000;

/** Section 179 phase-out threshold (TY2025, OBBBA). */
export const SECTION_179_PHASEOUT_THRESHOLD_2025 = 4_000_000;

/** Luxury auto Year 1 limit — without bonus depreciation (TY2025). */
export const LUXURY_AUTO_YEAR1_NO_BONUS_2025 = 12_200;

/** Luxury auto Year 1 limit — with bonus depreciation (TY2025). */
export const LUXURY_AUTO_YEAR1_WITH_BONUS_2025 = 20_200;

/** Luxury auto Year 2 limit (TY2025). */
export const LUXURY_AUTO_YEAR2_2025 = 19_600;

/** Luxury auto Year 3+ limit (TY2025). */
export const LUXURY_AUTO_YEAR3_PLUS_2025 = 11_900;

// ─── Schedule H — Household Employment Taxes ─────────────────────────────────
// IRC §3510; IRS Publication 926 (2025)

/** Household employment FICA threshold: wages that trigger FICA (TY2025). */
export const HOUSEHOLD_FICA_THRESHOLD_2025 = 2_800;

/** FUTA filing threshold — quarterly wages (statutory; not indexed). */
export const HOUSEHOLD_FUTA_QUARTERLY_THRESHOLD = 1_000;

// ─── Schedule A — Itemized Deductions ────────────────────────────────────────
// P.L. 119-21 ("One Big Beautiful Bill Act")

/**
 * SALT (state and local tax) cap — Single/MFJ (TY2025, OBBBA).
 * $20,000 for MFS.
 */
export const SALT_CAP_2025 = 40_000;

// ─── Dependent Care (Form 2441) ───────────────────────────────────────────────
// IRC §21; not indexed for inflation

/** Qualifying expense cap — one qualifying person. */
export const DEP_CARE_EXPENSE_CAP_ONE_2025 = 3_000;

/** Qualifying expense cap — two or more qualifying persons. */
export const DEP_CARE_EXPENSE_CAP_TWO_PLUS_2025 = 6_000;

/** Employer-provided dependent care exclusion limit — MFJ/single/HOH/QSS. */
export const DEP_CARE_EMPLOYER_EXCLUSION_2025 = 5_000;

/** Employer-provided dependent care exclusion limit — MFS. */
export const DEP_CARE_EMPLOYER_EXCLUSION_MFS_2025 = 2_500;

/** Credit rate phase-down starting AGI. */
export const DEP_CARE_CREDIT_RATE_AGI_THRESHOLD_2025 = 15_000;

/** Credit rate phase-down bracket size ($2,000 per 1% step). */
export const DEP_CARE_CREDIT_RATE_BRACKET_SIZE_2025 = 2_000;

// ─── ACA / Form 8962 ─────────────────────────────────────────────────────────
// IRC §36B; 2024 HHS FPL tables (IRS uses prior-year FPL)

/** Federal Poverty Level base amount for 2024 (used for TY2025 PTC). */
export const FPL_BASE_2025 = 15_060;

/** Federal Poverty Level per-person increment for 2024. */
export const FPL_INCREMENT_2025 = 5_380;

// ─── IRA Distributions (1099-R) ──────────────────────────────────────────────
// IRC §408(d)(8); IRC §72(t)(10)

/** QCD (Qualified Charitable Distribution) annual limit (TY2025). */
export const QCD_ANNUAL_LIMIT_2025 = 108_000;

/** Public Safety Officer health insurance exclusion limit. */
export const PSO_EXCLUSION_LIMIT_2025 = 3_000;

// ─── Schedule C / Schedule F — Excess Business Loss ──────────────────────────
// IRC §461(l); Rev. Proc. 2024-40, §3.30

/** Excess business loss threshold — Single/MFS/HOH/QSS (TY2025). */
export const EBL_THRESHOLD_SINGLE_2025 = 313_000;

/** Excess business loss threshold — MFJ (TY2025). */
export const EBL_THRESHOLD_MFJ_2025 = 626_000;

// ─── Form 8990 — Interest Expense Limitation ──────────────────────────────────
// IRC §163(j)(3); Rev. Proc. 2024-40

/** Small business gross receipts threshold exempting from §163(j) (TY2025). */
export const SMALL_BIZ_GROSS_RECEIPTS_2025 = 31_000_000;

// ─── W-2 — Retirement Plan Contribution Limits ───────────────────────────────
// Rev. Proc. 2024-40 / SECURE 2.0; IRC §402(g), §408(p)

/**
 * Elective deferral limits for 401(k)/403(b)/457(b) by age bracket.
 * Keys are inclusive upper age bounds; Infinity = age 64+.
 * 63-limit reflects SECURE 2.0 super catch-up (§109).
 */
export const RETIREMENT_LIMITS_2025: Record<string, Record<number, number>> = {
  "401k": { 49: 23_500, 59: 31_000, 63: 34_750, [Infinity]: 31_000 },
  "403b": { 49: 23_500, 59: 31_000, 63: 34_750, [Infinity]: 31_000 },
  "457b": { 49: 23_500, 59: 31_000, 63: 34_750, [Infinity]: 31_000 },
  "simple": { 49: 16_500, 59: 20_000, 63: 21_750, [Infinity]: 20_000 },
} as const;

// ─── Form 8853 — Archer MSA / LTC ────────────────────────────────────────────
// IRC §4974(c)(5); Rev. Proc. 2024-40

/** LTC per-diem daily limit for non-tax-qualified contracts (TY2025). */
export const LTC_PER_DIEM_DAILY_LIMIT_2025 = 420;

// ─── Form 4972 — Lump Sum Distributions ──────────────────────────────────────
// IRC §402(e)(1); Schedule G (Form 4972) — minimum distribution allowance

/** Minimum Distribution Allowance — maximum amount (step 1 of MDA formula). */
export const MDA_MAX_2025 = 10_000;

/** MDA phase-out start threshold. */
export const MDA_PHASE_OUT_THRESHOLD_2025 = 20_000;

/** MDA zeroes out when ordinary income reaches this amount. */
export const MDA_ZERO_THRESHOLD_2025 = 70_000;

/** Death benefit exclusion maximum. */
export const DEATH_BENEFIT_MAX_2025 = 5_000;

// ─── Form 982 — Qualified Principal Residence Indebtedness ───────────────────
// IRC §108(a)(1)(E)

/** QPRI exclusion cap — standard filers (TY2025). */
export const QPRI_CAP_STANDARD_2025 = 750_000;

/** QPRI exclusion cap — MFS filers (TY2025). */
export const QPRI_CAP_MFS_2025 = 375_000;

// ─── Form 1099-DIV / Form 1099-INT — Routing Thresholds ──────────────────────
// IRC §6012(a), Pub 550; holding period rules unchanged

/** Schedule B reporting threshold for ordinary dividends (unchanged). */
export const SCHEDULE_B_DIVIDEND_THRESHOLD = 1_500;

/** Foreign tax credit simplified computation threshold — Single. */
export const FOREIGN_TAX_SINGLE_THRESHOLD = 300;

/** Foreign tax credit simplified computation threshold — MFJ. */
export const FOREIGN_TAX_MFJ_THRESHOLD = 600;

/** §199A dividend threshold (routes to 8995A) — Single/MFS/HOH/QSS (TY2025). */
export const SEC199A_SINGLE_THRESHOLD_2025 = 197_300;

/** §199A dividend threshold (routes to 8995A) — MFJ (TY2025). */
export const SEC199A_MFJ_THRESHOLD_2025 = 394_600;

// ─── Form 8396 — Mortgage Interest Credit ─────────────────────────────────────
// IRC §25(a)(1); Rev. Proc. 2024-40 / Form 8396 instructions

/** Maximum annual mortgage interest credit when MCC rate exceeds 20% (TY2025). */
export const MCC_MAX_CREDIT_HIGH_RATE_2025 = 2_000;
