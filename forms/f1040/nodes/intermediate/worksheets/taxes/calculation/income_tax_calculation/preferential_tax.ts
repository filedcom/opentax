import type { FilingStatus } from "../../../../../types.ts";
import { bracketsForStatus } from "../tax_brackets.ts";
import {
  ordinaryTaxForYear,
  qualifiedDividendTaxForYear,
  type TaxRateYear,
  TY2025_RATES,
} from "../tax_table_2025.ts";

export interface PreferentialTaxFacts {
  taxableIncome: number;
  qualifiedDividends: number;
  netCapitalGain: number;
  filingStatus: FilingStatus;
  zeroCeiling: Record<FilingStatus, number>;
  twentyFloor: Record<FilingStatus, number>;
  unrecaptured1250Gain?: number;
  rate28Gain?: number;
  form4952Election?: number;
  electedCapitalGain?: number;
  /** The year's rate schedules; TY2025 when omitted. */
  rates?: TaxRateYear;
}

// Schedule D Tax Worksheet, lines 1–47 (2025 Instructions for Schedule D).
// Lines 44/46 use the Tax Table below $100,000, per
// https://www.irs.gov/instructions/i1040sd.
export function scheduleDTax(facts: PreferentialTaxFacts): number {
  const rates = facts.rates ?? TY2025_RATES;
  const ordinaryTax = ordinaryTaxForYear(rates);
  const {
    taxableIncome: line1,
    qualifiedDividends,
    netCapitalGain,
    filingStatus,
    zeroCeiling,
    twentyFloor,
  } = facts;
  const unrecaptured1250 = facts.unrecaptured1250Gain ?? 0;
  const rate28Gain = facts.rate28Gain ?? 0;
  const line3 = facts.form4952Election ?? 0;
  const line4 = facts.electedCapitalGain ?? 0;
  const line5 = Math.max(0, line3 - line4);
  const line6 = Math.max(0, qualifiedDividends - line5);
  const line8 = Math.min(line3, line4);
  const line9 = Math.max(0, netCapitalGain - line8);
  const line10 = line6 + line9;
  const line11 = rate28Gain + unrecaptured1250;
  const line12 = Math.min(line9, line11);
  const line13 = line10 - line12;
  const line14 = Math.max(0, line1 - line13);
  const line16 = Math.min(line1, zeroCeiling[filingStatus]);
  const line17 = Math.min(line14, line16);
  const line18 = Math.max(0, line1 - line10);
  // Line 19: the top of the 24% bracket ($394,600 MFJ, $197,300 otherwise
  // for 2025).
  const limit19 = bracketsForStatus(filingStatus, rates).find((bracket) =>
    bracket.rate === 0.24
  )!.upTo;
  const line19 = Math.min(line1, limit19);
  const line20 = Math.min(line14, line19);
  const line21 = Math.max(line18, line20);
  const line22 = line16 - line17;
  if (line1 === line16) {
    return Math.min(
      ordinaryTax(line21, filingStatus),
      ordinaryTax(line1, filingStatus),
    );
  }
  const line23 = Math.min(line1, line13);
  const line24 = line22;
  const line25 = Math.max(0, line23 - line24);
  const line27 = Math.min(line1, twentyFloor[filingStatus]);
  const line28 = line21 + line22;
  const line29 = Math.max(0, line27 - line28);
  const line30 = Math.min(line25, line29);
  const line31 = line30 * 0.15;
  const line32 = line24 + line30;
  if (line1 === line32) {
    return Math.round(Math.min(
      line31 + ordinaryTax(line21, filingStatus),
      ordinaryTax(line1, filingStatus),
    ));
  }
  const line33 = line23 - line32;
  const line34 = line33 * 0.20;
  const line35 = Math.min(line9, unrecaptured1250);
  const line36 = line10 + line21;
  const line38 = Math.max(0, line36 - line1);
  const line39 = Math.max(0, line35 - line38);
  const line40 = line39 * 0.25;
  const line41 = line21 + line22 + line30 + line33 + line39;
  const line42 = line1 - line41;
  const line43 = rate28Gain > 0 ? line42 * 0.28 : 0;
  const line44 = ordinaryTax(line21, filingStatus);
  const line45 = line31 + line34 + line40 + line43 + line44;
  return Math.round(Math.min(line45, ordinaryTax(line1, filingStatus)));
}

// Qualified Dividends and Capital Gain Tax Worksheet. Schedule D's
// special-rate route is selected when 25%/28% gains or Form 4952 apply.
export function preferentialTax(facts: PreferentialTaxFacts): number {
  const {
    taxableIncome,
    qualifiedDividends,
    netCapitalGain,
    filingStatus,
  } = facts;
  if (
    (facts.form4952Election ?? 0) > 0 ||
    (netCapitalGain > 0 &&
      ((facts.unrecaptured1250Gain ?? 0) > 0 ||
        (facts.rate28Gain ?? 0) > 0))
  ) {
    return scheduleDTax(facts);
  }
  return qualifiedDividendTaxForYear(
    taxableIncome,
    qualifiedDividends,
    netCapitalGain,
    filingStatus,
    facts.rates ?? TY2025_RATES,
  );
}

// Form 1040 Foreign Earned Income Tax Worksheet preferential-income route.
// Its capital-gain excess is removed from Schedule D gain first and then
// qualified dividends before line 4 is calculated on stacked income.
export function foreignEarnedIncomePreferentialTax(
  facts: PreferentialTaxFacts,
  taxableExcludedIncome: number,
): number {
  const rates = facts.rates ?? TY2025_RATES;
  const ordinaryTax = ordinaryTaxForYear(rates);
  const capitalGainExcess = Math.max(
    0,
    facts.qualifiedDividends + facts.netCapitalGain - facts.taxableIncome,
  );
  const usesScheduleD = (facts.form4952Election ?? 0) > 0 ||
    (facts.netCapitalGain > 0 &&
      ((facts.unrecaptured1250Gain ?? 0) > 0 ||
        (facts.rate28Gain ?? 0) > 0));
  if (capitalGainExcess === 0 && usesScheduleD) {
    return Math.max(
      0,
      scheduleDTax({
        ...facts,
        taxableIncome: facts.taxableIncome + taxableExcludedIncome,
      }) - ordinaryTax(taxableExcludedIncome, facts.filingStatus),
    );
  }
  if (usesScheduleD) {
    throw new Error(
      "Form 2555 with Schedule D special-rate gain needs the Foreign Earned Income Tax Worksheet Schedule D refigure",
    );
  }
  const adjustedNetCapitalGain = Math.max(
    0,
    facts.netCapitalGain - capitalGainExcess,
  );
  const adjustedQualifiedDividends = Math.max(
    0,
    facts.qualifiedDividends -
      Math.max(0, capitalGainExcess - facts.netCapitalGain),
  );
  const stackedTax = qualifiedDividendTaxForYear(
    facts.taxableIncome + taxableExcludedIncome,
    adjustedQualifiedDividends,
    adjustedNetCapitalGain,
    facts.filingStatus,
    rates,
  );
  return Math.max(
    0,
    stackedTax - ordinaryTax(taxableExcludedIncome, facts.filingStatus),
  );
}
