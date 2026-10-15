import { FilingStatus } from "../../../../../types.ts";

// Form 6251 Line 5 Worksheet: compute the exemption amount with phase-out
// Annual policy supplies the phaseout rate (25% in 2025, 50% in 2026).
// IRC §55(d); Form 6251 Instructions page 9
export function computeExemption(
  amti: number,
  status: FilingStatus,
  exemption: Record<FilingStatus, number>,
  phaseOutStart: Record<FilingStatus, number>,
  phaseOutRate = 0.25, // Compatibility default for existing 2025 callers.
): number {
  const fullExemption = exemption[status];
  const start = phaseOutStart[status];
  const excess = Math.max(0, amti - start);
  // Retain the unpublished worksheet multiplication through subtraction;
  // settle only the resulting exemption entered on filed line5.
  const reduction = excess * phaseOutRate;
  return Math.round(Math.max(0, fullExemption - reduction));
}

// Form 6251 Line 6: Taxable excess (AMTI minus exemption)
// Line 6 = max(0, Line 4 − Line 5)
export function computeTaxableExcess(amti: number, exemption: number): number {
  return Math.max(0, amti - exemption);
}

// Form 6251 Line 7: Tentative Minimum Tax using 26%/28% rate structure
// MFS filers use a halved bracket threshold ($119,550 vs $239,100).
// For line6 ≤ threshold:   TMT = line6 × 26%
// For line6 > threshold:   TMT = line6 × 28% − adjustment
// Source: IRS Instructions for Form 6251 (2025), "Line 7" / "What's New"
export function computeTentativeMinimumTax(
  taxableExcess: number,
  status: FilingStatus,
  thresholdStandard: number,
  thresholdMfs: number,
  adjustmentStandard: number,
  adjustmentMfs: number,
): number {
  if (taxableExcess === 0) return 0;
  const threshold = status === FilingStatus.MFS
    ? thresholdMfs
    : thresholdStandard;
  const adjustment = status === FilingStatus.MFS
    ? adjustmentMfs
    : adjustmentStandard;
  if (taxableExcess <= threshold) {
    return Math.round(Math.round(taxableExcess) * 0.26);
  }
  return Math.round(Math.round(taxableExcess) * 0.28 - adjustment);
}

// 2025 Form 6251 Foreign Earned Income Tax Worksheet, ordinary-income branch.
export function computeForeignEarnedIncomeTax(
  taxableExcess: number,
  excludedIncome: number,
  disallowedDeductions: number,
  status: FilingStatus,
  thresholdStandard: number,
  thresholdMfs: number,
  adjustmentStandard: number,
  adjustmentMfs: number,
): number {
  if (taxableExcess === 0) return 0;
  const line2c = Math.max(0, excludedIncome - disallowedDeductions);
  const line3 = taxableExcess + line2c;
  return computeTentativeMinimumTax(
    line3,
    status,
    thresholdStandard,
    thresholdMfs,
    adjustmentStandard,
    adjustmentMfs,
  ) - computeTentativeMinimumTax(
    line2c,
    status,
    thresholdStandard,
    thresholdMfs,
    adjustmentStandard,
    adjustmentMfs,
  );
}

// Form 6251 Line 9: TMT net of AMTFTC. Cannot be negative.
// Line 9 = max(0, Line 7 − Line 8)
export function computeNetTmt(tmt: number, amtftc: number): number {
  return Math.max(0, tmt - amtftc);
}

// Form 6251 Line 11: AMT liability = max(0, net TMT − regular tax)
// Only positive when tentative minimum tax exceeds regular income tax.
// IRC §55(a); Form 6251 Line 11 → 2025 Schedule 2 Line 2
export function computeAmt(netTmt: number, regularTax: number): number {
  return Math.max(0, netTmt - regularTax);
}

// Form 6251 Part III lines 13–15, 20, and 27 draw from either the QDCGT
// Worksheet or the Schedule D Tax Worksheet used for regular tax.
export function partThreeWorksheetInputs(
  regularTaxableIncome: number,
  qualDividends: number,
  netCapGain: number,
  unrecaptured1250: number,
  rate28Gain: number,
  status: FilingStatus,
  form4952Election: number,
  electedCapitalGain: number,
  scheduleDLine19Limit =
    status === FilingStatus.MFJ || status === FilingStatus.QSS
      ? 394_600
      : 197_300, // Compatibility default for 2025; other years pass their limit.
): {
  line13: number;
  line14: number;
  line15: number;
  line20: number;
  line27: number;
} {
  const worksheetLine6 = Math.max(
    0,
    qualDividends - Math.max(0, form4952Election - electedCapitalGain),
  );
  const worksheetLine9 = Math.max(0, netCapGain - electedCapitalGain);
  const worksheetLine10 = worksheetLine6 + worksheetLine9;
  const useScheduleD = form4952Election > 0 ||
    (netCapGain > 0 && (unrecaptured1250 > 0 || rate28Gain > 0));
  if (!useScheduleD) {
    const regularWorksheetLine5 = Math.max(
      0,
      regularTaxableIncome - worksheetLine10,
    );
    return {
      line13: worksheetLine10,
      line14: 0,
      line15: worksheetLine10,
      line20: regularWorksheetLine5,
      line27: regularWorksheetLine5,
    };
  }

  // Schedule D Tax Worksheet lines 10–14 and 18–21, including Form 4952
  // line 4g amounts removed from preferential-rate income.
  const scheduleDLine9 = worksheetLine9;
  const scheduleDLine11 = rate28Gain + unrecaptured1250;
  const scheduleDLine12 = Math.min(scheduleDLine9, scheduleDLine11);
  const scheduleDLine13 = worksheetLine10 - scheduleDLine12;
  const scheduleDLine14 = Math.max(0, regularTaxableIncome - scheduleDLine13);
  const scheduleDLine18 = Math.max(0, regularTaxableIncome - worksheetLine10);
  const scheduleDLine19 = Math.min(regularTaxableIncome, scheduleDLine19Limit);
  const scheduleDLine20 = Math.min(scheduleDLine14, scheduleDLine19);
  const scheduleDLine21 = Math.max(scheduleDLine18, scheduleDLine20);
  return {
    line13: scheduleDLine13,
    line14: unrecaptured1250,
    line15: Math.min(scheduleDLine13 + unrecaptured1250, worksheetLine10),
    line20: regularTaxableIncome > 0 ? scheduleDLine14 : 0,
    line27: regularTaxableIncome > 0 ? scheduleDLine21 : 0,
  };
}

// Form 6251 Part III, using the worksheet amounts above for both the
// regular QDCGT and Schedule D Tax Worksheet branches.
export function computePartThree(
  taxableExcess: number,
  worksheet: ReturnType<typeof partThreeWorksheetInputs>,
  status: FilingStatus,
  zeroCeilingMap: Record<FilingStatus, number>,
  twentyFloorMap: Record<FilingStatus, number>,
  thresholdStandard: number,
  thresholdMfs: number,
  adjustmentStandard: number,
  adjustmentMfs: number,
): Record<string, number> {
  const line12 = taxableExcess;
  const { line13, line14, line15, line20, line27 } = worksheet;
  const line16 = Math.min(line12, line15);
  const line17 = line12 - line16;
  const amtOrdinaryTax = (income: number) =>
    computeTentativeMinimumTax(
      income,
      status,
      thresholdStandard,
      thresholdMfs,
      adjustmentStandard,
      adjustmentMfs,
    );
  const line18 = amtOrdinaryTax(line17);
  const line19 = zeroCeilingMap[status];
  const line21 = Math.max(0, line19 - line20);
  const line22 = Math.min(line12, line13);
  const line23 = Math.min(line21, line22);
  const line24 = line22 - line23;
  const line25 = twentyFloorMap[status];
  const line26 = line21;
  const line28 = line26 + line27;
  const line29 = Math.max(0, line25 - line28);
  const line30 = Math.min(line24, line29);
  const line31 = Math.round(line30 * 0.15);
  const line32 = line23 + line30;
  const line33 = line22 - line32;
  const line34 = Math.round(line33 * 0.20);
  const line35 = line17 + line32 + line33;
  const line36 = line12 - line35;
  const line37 = Math.round(line36 * 0.25);
  const line38 = line18 + line31 + line34 + (line14 > 0 ? line37 : 0);
  const line39 = amtOrdinaryTax(line12);
  const line40 = Math.min(line38, line39);
  const additionalRateLinesApply = line32 !== line12;
  return {
    line12,
    line13,
    ...(line14 > 0 ? { line14 } : {}),
    line15,
    line16,
    line17,
    line18,
    line19,
    line20,
    line21,
    line22,
    line23,
    line24,
    line25,
    line26,
    line27,
    line28,
    line29,
    line30,
    line31,
    line32,
    ...(additionalRateLinesApply ? { line33, line34 } : {}),
    ...(additionalRateLinesApply && line14 > 0
      ? { line35, line36, line37 }
      : {}),
    line38,
    line39,
    line40,
  };
}

/** Section 55(d)(2), including the annual substitution under (d)(4). */
export function computeMfsAddition(
  base: number,
  start: number,
  cap: number,
  rate: number,
): number {
  return Math.min(cap, Math.max(0, Math.round((base - start) * rate)));
}
