/**
 * 2025 Federal Income Tax Calculator
 * Computes correct expected values for benchmark cases.
 */

export type FilingStatus = "single" | "mfj" | "mfs" | "hoh" | "qss";

// ── 2025 Standard Deductions ──────────────────────────────────────────────────
const STD_DEDUCTION: Record<FilingStatus, number> = {
  single: 15_000, mfj: 30_000, mfs: 15_000, hoh: 22_500, qss: 30_000,
};
const STD_EXTRA_SINGLE = 2_000; // single / hoh per qualifying senior or blind
const STD_EXTRA_MFJ    = 1_600; // mfj / mfs / qss per qualifying senior or blind

// ── 2025 Tax Brackets ─────────────────────────────────────────────────────────
// Each entry: [upper_limit, rate]
type Bracket = [number, number];
const BRACKETS: Record<FilingStatus, Bracket[]> = {
  single: [[11_925,0.10],[48_475,0.12],[103_350,0.22],[197_300,0.24],[250_525,0.32],[626_350,0.35],[Infinity,0.37]],
  mfj:    [[23_850,0.10],[96_950,0.12],[206_700,0.22],[394_600,0.24],[501_050,0.32],[751_600,0.35],[Infinity,0.37]],
  mfs:    [[11_925,0.10],[48_475,0.12],[103_350,0.22],[197_300,0.24],[250_525,0.32],[375_800,0.35],[Infinity,0.37]],
  hoh:    [[17_000,0.10],[64_850,0.12],[103_350,0.22],[197_300,0.24],[250_500,0.32],[626_350,0.35],[Infinity,0.37]],
  qss:    [[23_850,0.10],[96_950,0.12],[206_700,0.22],[394_600,0.24],[501_050,0.32],[751_600,0.35],[Infinity,0.37]],
};

// ── 2025 LTCG / Qualified Dividend Rates ──────────────────────────────────────
const LTCG_BRACKETS: Record<FilingStatus, Bracket[]> = {
  single: [[48_350,0.00],[533_400,0.15],[Infinity,0.20]],
  mfj:    [[96_700,0.00],[600_050,0.15],[Infinity,0.20]],
  mfs:    [[48_350,0.00],[300_000,0.15],[Infinity,0.20]],
  hoh:    [[64_750,0.00],[566_700,0.15],[Infinity,0.20]],
  qss:    [[96_700,0.00],[600_050,0.15],[Infinity,0.20]],
};

// ── 2025 EITC Parameters ──────────────────────────────────────────────────────
interface EitcParams {
  max: number; rate_in: number; rate_out: number;
  start_s: number; start_m: number; end_s: number; end_m: number;
}
const EITC: Record<number, EitcParams> = {
  0: { max: 649,   rate_in: 0.0765, rate_out: 0.0765, start_s: 10_620, start_m: 17_430, end_s: 19_104, end_m: 26_214 },
  1: { max: 4_328, rate_in: 0.34,   rate_out: 0.1598, start_s: 23_511, start_m: 30_323, end_s: 50_657, end_m: 57_669 },
  2: { max: 7_152, rate_in: 0.40,   rate_out: 0.2106, start_s: 23_511, start_m: 30_323, end_s: 57_554, end_m: 64_566 },
  3: { max: 8_046, rate_in: 0.45,   rate_out: 0.2106, start_s: 23_511, start_m: 30_323, end_s: 57_554, end_m: 64_566 },
};

const SS_WAGE_BASE_2025 = 176_100;

function r2(n: number): number { return Math.round(n * 100) / 100; }

function bracketTax(income: number, status: FilingStatus): number {
  let prev = 0, tax = 0;
  for (const [upper, rate] of BRACKETS[status]) {
    if (income <= prev) break;
    tax += (Math.min(income, upper) - prev) * rate;
    prev = upper;
  }
  return r2(tax);
}

function ltcgTax(ordinaryIncome: number, ltcg: number, status: FilingStatus): number {
  const ltcgStart = ordinaryIncome;
  const ltcgEnd   = ordinaryIncome + ltcg;
  let prev = 0, tax = 0;
  for (const [upper, rate] of LTCG_BRACKETS[status]) {
    if (ltcgEnd <= prev || ltcgStart >= upper) { prev = upper; continue; }
    const lo = Math.max(ltcgStart, prev);
    const hi = Math.min(ltcgEnd, upper);
    if (hi > lo) tax += (hi - lo) * rate;
    prev = upper;
  }
  return r2(tax);
}

function seTax(netSe: number): [total: number, half: number] {
  const net92 = netSe * 0.9235;
  const total = r2(Math.min(net92, SS_WAGE_BASE_2025) * 0.124 + net92 * 0.029);
  return [total, r2(total / 2)];
}

function ssTaxable(agiExSs: number, ssBenefits: number, status: FilingStatus): number {
  const provisional = agiExSs + ssBenefits / 2;
  const [t1, t2] = status === "mfj" ? [32_000, 44_000] : [25_000, 34_000];
  if (provisional <= t1) return 0;
  if (provisional <= t2) return Math.min(0.5 * (provisional - t1), 0.5 * ssBenefits);
  return r2(Math.min(0.5 * (t2 - t1) + 0.85 * (provisional - t2), 0.85 * ssBenefits));
}

function eitcCredit(earned: number, children: number, status: FilingStatus): number {
  const p = EITC[Math.min(children, 3)];
  let credit = Math.min(earned * p.rate_in, p.max);
  const start = status === "mfj" ? p.start_m : p.start_s;
  const end   = status === "mfj" ? p.end_m   : p.end_s;
  if (earned > start) {
    credit = Math.max(0, credit - (Math.min(earned, end) - start) * p.rate_out);
  }
  return r2(credit);
}

function ctcAndActc(
  agi: number, earned: number, qualifyingChildren: number,
  taxBeforeCredits: number, status: FilingStatus,
): [nonref: number, actc: number] {
  if (qualifyingChildren === 0) return [0, 0];
  const limit = (status === "mfj" || status === "qss") ? 400_000 : 200_000;
  const reduction = Math.max(0, Math.ceil((agi - limit) / 1000)) * 50;
  const totalCtc = Math.max(0, qualifyingChildren * 2_000 - reduction);
  const nonref = Math.min(totalCtc, taxBeforeCredits);
  const unused = totalCtc - nonref;
  const actc = Math.min(Math.max(0, (earned - 2_500) * 0.15), qualifyingChildren * 1_700, unused);
  return [r2(nonref), r2(actc)];
}

function dependentCareCredit(agi: number, expenses: number, qualifyingPersons: number): number {
  const eligible = Math.min(expenses, qualifyingPersons === 1 ? 3_000 : 6_000);
  const rate =
    agi <= 15_000 ? 0.35 : agi <= 17_000 ? 0.34 : agi <= 19_000 ? 0.33 :
    agi <= 21_000 ? 0.32 : agi <= 23_000 ? 0.31 : agi <= 25_000 ? 0.30 :
    agi <= 27_000 ? 0.29 : agi <= 29_000 ? 0.28 : agi <= 31_000 ? 0.27 :
    agi <= 33_000 ? 0.26 : agi <= 35_000 ? 0.25 : agi <= 37_000 ? 0.24 :
    agi <= 39_000 ? 0.23 : agi <= 41_000 ? 0.22 : agi <= 43_000 ? 0.21 : 0.20;
  return r2(eligible * rate);
}

function excessSsCredit(ssWagesList: number[], ssWithheldList: number[]): number {
  const maxSs = SS_WAGE_BASE_2025 * 0.062;
  return r2(Math.max(0, ssWithheldList.reduce((a, b) => a + b, 0) - maxSs));
}

function additionalMedicareTax(wages: number, seIncome: number, status: FilingStatus): number {
  const threshold = status === "mfj" ? 250_000 : 200_000;
  return r2(Math.max(0, (wages + seIncome - threshold) * 0.009));
}

export interface TaxReturnInput {
  status: FilingStatus;
  taxpayer65?: boolean;
  taxpayerBlind?: boolean;
  spouse65?: boolean;
  spouseBlind?: boolean;
  wages?: number;
  unemployment?: number;
  interest?: number;
  ordinaryDividends?: number;
  qualifiedDividends?: number;
  ltcg?: number;
  pension?: number;
  ssaGross?: number;
  scheduleCNet?: number;
  studentLoanInterestPaid?: number;
  hsaEmployer?: number;
  educatorExpenses?: number;
  educatorExpensesSp?: number;
  qualifyingChildren?: number;
  eitcChildren?: number;
  depCareExpenses?: number;
  depCarePersons?: number;
  aotcExpenses?: number;
  marketplacePremium?: number;
  marketplaceSlcsp?: number;
  marketplaceAptc?: number;
  fedWithheld?: number;
  estimatedTaxPayments?: number;
  ssWagesList?: number[];
  ssWithheldList?: number[];
}

export interface TaxResult {
  line9_total_income: number;
  line11_agi: number;
  standard_deduction: number;
  qbi_deduction: number;
  line15_taxable_income: number;
  ordinary_taxable: number;
  income_tax: number;
  se_tax: number;
  add_medicare_tax: number;
  line18_tax_before_credits: number;
  nonref_ctc: number;
  dependent_care_credit: number;
  aotc_nonref: number;
  aotc_refundable: number;
  ptc_additional: number;
  ptc_repayment: number;
  eitc: number;
  actc: number;
  excess_ss_credit: number;
  line24_total_tax: number;
  line33_total_payments: number;
  line35a_refund: number;
  line37_amount_owed: number;
}

export function computeTax(inp: TaxReturnInput): TaxResult {
  const s = inp.status;
  const wages                  = inp.wages                  ?? 0;
  const unemployment           = inp.unemployment           ?? 0;
  const interest               = inp.interest               ?? 0;
  const ordinaryDividends      = inp.ordinaryDividends      ?? 0;
  const qualifiedDividends     = inp.qualifiedDividends     ?? 0;
  const ltcg                   = inp.ltcg                   ?? 0;
  const pension                = inp.pension                ?? 0;
  const ssaGross               = inp.ssaGross               ?? 0;
  const scheduleCNet           = inp.scheduleCNet           ?? 0;
  const studentLoanInterest    = inp.studentLoanInterestPaid ?? 0;
  const hsaEmployer            = inp.hsaEmployer            ?? 0;
  const educatorExpenses       = inp.educatorExpenses       ?? 0;
  const educatorExpensesSp     = inp.educatorExpensesSp     ?? 0;
  const qualifyingChildren     = inp.qualifyingChildren     ?? 0;
  const eitcChildren           = inp.eitcChildren           ?? 0;
  const depCareExpenses        = inp.depCareExpenses        ?? 0;
  const depCarePersons         = inp.depCarePersons         ?? 0;
  const aotcExpenses           = inp.aotcExpenses           ?? 0;
  const marketplacePremium     = inp.marketplacePremium     ?? 0;
  const marketplaceSlcsp       = inp.marketplaceSlcsp       ?? 0;
  const marketplaceAptc        = inp.marketplaceAptc        ?? 0;
  const fedWithheld            = inp.fedWithheld            ?? 0;
  const estimatedTaxPayments   = inp.estimatedTaxPayments   ?? 0;
  const ssWagesList            = inp.ssWagesList            ?? [];
  const ssWithheldList         = inp.ssWithheldList         ?? [];

  // SE Tax
  let seTotal = 0, seHalf = 0;
  if (scheduleCNet > 0) [seTotal, seHalf] = seTax(scheduleCNet);

  // Educator Expense Deduction (capped at $300/person)
  const educatorDeduction = Math.min(educatorExpenses, 300) +
    (s === "mfj" ? Math.min(educatorExpensesSp, 300) : 0);

  // Student Loan Interest Deduction (phase-out)
  const sliPhaseStart = s === "mfj" ? 175_000 : 85_000;
  const sliPhaseEnd   = s === "mfj" ? 205_000 : 100_000;
  const sliAgiApprox  = wages + unemployment + interest + ordinaryDividends + pension + scheduleCNet - seHalf;
  let sli: number;
  if (sliAgiApprox >= sliPhaseEnd) {
    sli = 0;
  } else if (sliAgiApprox > sliPhaseStart) {
    const frac = (sliAgiApprox - sliPhaseStart) / (sliPhaseEnd - sliPhaseStart);
    sli = r2(Math.min(studentLoanInterest, 2_500) * (1 - frac));
  } else {
    sli = Math.min(studentLoanInterest, 2_500);
  }

  // SSA Taxability
  const agiExSs = wages + unemployment + interest + ordinaryDividends + ltcg +
                  pension + scheduleCNet - seHalf - sli;
  const ssTaxableAmt = ssTaxable(agiExSs, ssaGross, s);

  // AGI
  const totalIncome = wages + unemployment + interest + ordinaryDividends + ltcg +
                      pension + ssTaxableAmt + scheduleCNet;
  const agi = r2(totalIncome - seHalf - sli - hsaEmployer - educatorDeduction);

  // Standard Deduction (+ senior/blind add-ons)
  let std = STD_DEDUCTION[s];
  if (s === "single" || s === "hoh") {
    std += STD_EXTRA_SINGLE * ((inp.taxpayer65 ? 1 : 0) + (inp.taxpayerBlind ? 1 : 0));
  } else {
    std += STD_EXTRA_MFJ * (
      (inp.taxpayer65 ? 1 : 0) + (inp.taxpayerBlind ? 1 : 0) +
      (inp.spouse65 ? 1 : 0)   + (inp.spouseBlind ? 1 : 0)
    );
  }

  // QBI Deduction
  const qbiThreshold = s === "mfj" ? 394_600 : 197_300;
  let qbi = 0;
  if (scheduleCNet > 0 && agi <= qbiThreshold) {
    qbi = Math.max(0, r2(Math.min(scheduleCNet * 0.20, (agi - std) * 0.20)));
  }

  // Taxable Income
  const taxable = Math.max(0, r2(agi - std - qbi));

  // Ordinary vs Preferential Income
  const prefIncome     = qualifiedDividends + ltcg;
  const ordinaryTaxable = Math.max(0, taxable - prefIncome);

  // Income Tax
  const incomeTax      = bracketTax(ordinaryTaxable, s);
  const prefTax        = prefIncome > 0 ? ltcgTax(ordinaryTaxable, prefIncome, s) : 0;
  const totalIncomeTax = r2(incomeTax + prefTax);

  // Additional Medicare Tax (0.9%)
  const addMcare = additionalMedicareTax(wages, scheduleCNet, s);

  // Total Tax Before Credits
  const taxBeforeCredits = r2(totalIncomeTax + seTotal + addMcare);

  // AOTC
  const aotcPhaseStart = s === "mfj" ? 160_000 : 80_000;
  const aotcPhaseEnd   = s === "mfj" ? 180_000 : 90_000;
  let aotcNonref = 0, aotcRefundable = 0;
  if (aotcExpenses > 0 && agi < aotcPhaseEnd) {
    const phaseFrac = agi > aotcPhaseStart
      ? 1 - (agi - aotcPhaseStart) / (aotcPhaseEnd - aotcPhaseStart) : 1;
    const rawAotc = r2((Math.min(aotcExpenses, 2_000) + Math.min(Math.max(0, aotcExpenses - 2_000), 2_000) * 0.25) * phaseFrac);
    aotcNonref     = r2(rawAotc * 0.60);
    aotcRefundable = r2(rawAotc - aotcNonref);
  }

  // Marketplace PTC
  let ptcAdditional = 0, ptcRepayment = 0;
  if (marketplaceAptc > 0) {
    const netPtc = Math.min(marketplacePremium, marketplaceSlcsp) - marketplaceAptc;
    if (netPtc > 0) ptcAdditional = netPtc; else ptcRepayment = -netPtc;
  }

  // Non-Refundable Credits
  const [nonrefCtc, actc] = ctcAndActc(agi, wages, qualifyingChildren, taxBeforeCredits, s);
  let depCare = 0;
  if (depCareExpenses > 0) {
    depCare = Math.min(
      dependentCareCredit(agi, depCareExpenses, depCarePersons),
      Math.max(0, taxBeforeCredits - nonrefCtc),
    );
  }
  const aotcNonrefApplied = Math.min(aotcNonref, Math.max(0, taxBeforeCredits - nonrefCtc - depCare));

  const earnedForEitc = scheduleCNet > 0 ? wages + scheduleCNet : wages;
  const eitc = eitcCredit(earnedForEitc, eitcChildren, s);
  const excessSs = excessSsCredit(ssWagesList, ssWithheldList);

  // Total Tax
  const totalTax = r2(Math.max(0, taxBeforeCredits - nonrefCtc - depCare - aotcNonrefApplied + ptcRepayment));

  // Payments
  const totalPayments = r2(fedWithheld + estimatedTaxPayments + actc + eitc + aotcRefundable + ptcAdditional + excessSs);

  // Refund / Owed
  const balance = r2(totalPayments - totalTax);

  return {
    line9_total_income:        r2(totalIncome),
    line11_agi:                agi,
    standard_deduction:        std,
    qbi_deduction:             qbi,
    line15_taxable_income:     taxable,
    ordinary_taxable:          ordinaryTaxable,
    income_tax:                totalIncomeTax,
    se_tax:                    seTotal,
    add_medicare_tax:          addMcare,
    line18_tax_before_credits: taxBeforeCredits,
    nonref_ctc:                nonrefCtc,
    dependent_care_credit:     depCare,
    aotc_nonref:               aotcNonrefApplied,
    aotc_refundable:           aotcRefundable,
    ptc_additional:            ptcAdditional,
    ptc_repayment:             ptcRepayment,
    eitc,
    actc,
    excess_ss_credit:          excessSs,
    line24_total_tax:          totalTax,
    line33_total_payments:     totalPayments,
    line35a_refund:            balance > 0 ? r2(balance)  : 0,
    line37_amount_owed:        balance < 0 ? r2(-balance) : 0,
  };
}
