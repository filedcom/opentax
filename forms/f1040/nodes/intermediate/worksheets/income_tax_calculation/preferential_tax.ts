import { FilingStatus } from "../../../types.ts";
import type { Bracket } from "../../../config/2025.ts";
import { taxFromBrackets } from "../tax_brackets.ts";

export interface PreferentialTaxFacts {
  taxableIncome: number;
  qualifiedDividends: number;
  netCapitalGain: number;
  filingStatus: FilingStatus;
  brackets: ReadonlyArray<Bracket>;
  zeroCeiling: Record<FilingStatus, number>;
  twentyFloor: Record<FilingStatus, number>;
  unrecaptured1250Gain?: number;
  rate28Gain?: number;
  form4952Election?: number;
  electedCapitalGain?: number;
}

// TY2025 Schedule D Tax Worksheet, lines 1–47. Keep this shared with Form
// 1040 so Form 8615 lines 9 and 15 use the same tax computation.
export function scheduleDTax(facts: PreferentialTaxFacts): number {
  const {
    taxableIncome: line1,
    qualifiedDividends,
    netCapitalGain,
    filingStatus,
    brackets,
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
  const limit19 = filingStatus === FilingStatus.MFJ ||
      filingStatus === FilingStatus.QSS
    ? 394_600
    : 197_300;
  const line19 = Math.min(line1, limit19);
  const line20 = Math.min(line14, line19);
  const line21 = Math.max(line18, line20);
  const line22 = line16 - line17;
  if (line1 === line16) {
    return Math.min(
      taxFromBrackets(line21, brackets),
      taxFromBrackets(line1, brackets),
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
    return Math.min(
      line31 + taxFromBrackets(line21, brackets),
      taxFromBrackets(line1, brackets),
    );
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
  const line44 = taxFromBrackets(line21, brackets);
  const line45 = line31 + line34 + line40 + line43 + line44;
  return Math.min(line45, taxFromBrackets(line1, brackets));
}

// TY2025 Qualified Dividends and Capital Gain Tax Worksheet. Schedule D's
// special-rate route is selected when 25%/28% gains or Form 4952 apply.
export function preferentialTax(facts: PreferentialTaxFacts): number {
  const {
    taxableIncome,
    qualifiedDividends,
    netCapitalGain,
    filingStatus,
    brackets,
    zeroCeiling,
    twentyFloor,
  } = facts;
  if (
    (facts.form4952Election ?? 0) > 0 ||
    (netCapitalGain > 0 &&
      ((facts.unrecaptured1250Gain ?? 0) > 0 ||
        (facts.rate28Gain ?? 0) > 0))
  ) {
    return scheduleDTax(facts);
  }
  const prefIncome = Math.min(
    qualifiedDividends + netCapitalGain,
    taxableIncome,
  );
  if (prefIncome <= 0) return taxFromBrackets(taxableIncome, brackets);
  const ordinary = taxableIncome - prefIncome;
  const inZero = Math.max(
    0,
    Math.min(taxableIncome, zeroCeiling[filingStatus]) - ordinary,
  );
  const remaining = prefIncome - inZero;
  const availFifteen = Math.max(
    0,
    twentyFloor[filingStatus] -
      Math.max(ordinary, zeroCeiling[filingStatus]),
  );
  const inFifteen = Math.min(remaining, availFifteen);
  const inTwenty = remaining - inFifteen;
  return Math.min(
    inFifteen * 0.15 + inTwenty * 0.20 +
      taxFromBrackets(ordinary, brackets),
    taxFromBrackets(taxableIncome, brackets),
  );
}
