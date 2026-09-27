import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  regular_tax_income?: number | null;
  regular_tax?: number | null;
  iso_adjustment?: number | null;
  depreciation_adjustment?: number | null;
  nol_adjustment?: number | null;
  private_activity_bond_interest?: number | null;
  qsbs_adjustment?: number | null;
  line2a_taxes_paid?: number | null;
  line2c_investment_interest?: number | null;
  other_adjustments?: number | null;
  amtftc?: number | null;
  amti?: number | null;
  exemption?: number | null;
  taxable_excess?: number | null;
  tentative_tax?: number | null;
  net_tmt?: number | null;
  line11_amt?: number | null;
  must_file_for_credit?: boolean | null;
  line12?: number | null;
  line13?: number | null;
  line14?: number | null;
  line15?: number | null;
  line16?: number | null;
  line17?: number | null;
  line18?: number | null;
  line19?: number | null;
  line20?: number | null;
  line21?: number | null;
  line22?: number | null;
  line23?: number | null;
  line24?: number | null;
  line25?: number | null;
  line27?: number | null;
  line28?: number | null;
  line29?: number | null;
  line30?: number | null;
  line31?: number | null;
  line32?: number | null;
  line33?: number | null;
  line34?: number | null;
  line35?: number | null;
  line36?: number | null;
  line37?: number | null;
  line38?: number | null;
  line39?: number | null;
  line40?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Tag names verified against IRS6251.xsd (2025v5.4).
// Element order matches the XSD sequence (required for validation).
// - regular_tax_income → AGILessTotDedLessEnhncSrDedAmt (line 1b)
// - line2a_taxes_paid  → ScheduleATaxesAmt          (line 2a)
// - nol_adjustment     → AltTaxNetOperatingLossDedAmt (line 2f)
// - private_activity_bond_interest → ExemptPrivateActivityBondsAmt (line 2g)
// - qsbs_adjustment    → Section1202ExclusionAmt    (line 2h)
// - iso_adjustment     → IncentiveStockOptionsAmt   (line 2i)
// - depreciation_adjustment → DepreciationAmt       (line 2l)
// - other_adjustments  → RelatedAdjustmentAmt       (line 3)
// - amtftc             → AMTForeignTaxCreditAmt     (line 8)
// - regular_tax        → AdjustedRegularTaxAmt      (line 10)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["regular_tax_income", "AGILessTotDedLessEnhncSrDedAmt"],
  ["line2a_taxes_paid", "ScheduleATaxesAmt"],
  ["line2c_investment_interest", "InvestmentInterestAmt"],
  ["nol_adjustment", "AltTaxNetOperatingLossDedAmt"],
  ["private_activity_bond_interest", "ExemptPrivateActivityBondsAmt"],
  ["qsbs_adjustment", "Section1202ExclusionAmt"],
  ["iso_adjustment", "IncentiveStockOptionsAmt"],
  ["depreciation_adjustment", "DepreciationAmt"],
  ["other_adjustments", "RelatedAdjustmentAmt"],
  ["amti", "AlternativeMinTaxableIncomeAmt"],
  ["exemption", "AlternativeMinimumTaxExemptAmt"],
  ["taxable_excess", "AdjAlternativeMinTaxableIncAmt"],
  ["tentative_tax", "TaxOnAltMinTaxableIncAmt"],
  ["amtftc", "AMTForeignTaxCreditAmt"],
  ["net_tmt", "TentativeAlternativeMinTaxAmt"],
  ["regular_tax", "AdjustedRegularTaxAmt"],
  ["line11_amt", "AlternativeMinimumTaxAmt"],
  ["line12", "ReportedAltMinTaxableIncAmt"],
  ["line13", "CapitalGainsWorksheetAmt"],
  ["line14", "UnrecapturedSection1250GainAmt"],
  ["line15", "SumPlusUnrecapturedSect1250Amt"],
  ["line16", "SmallerOfAltMinTxblIncOrSumAmt"],
  ["line17", "AdjAltMinTaxableIncLessGainAmt"],
  ["line18", "NetAdjAltMinTxblIncTimesPctAmt"],
  ["line19", "FilingStatusLimitAmt"],
  ["line20", "IncomeAboveThresholdWorkshtAmt"],
  ["line21", "FSAmtLessIncAboveThresholdAmt"],
  ["line22", "SmllrOfAdjustedAltMinOrSchDAmt"],
  ["line23", "SmllrAbvThrshldOrAltMinGainAmt"],
  ["line24", "SmllrNetAdjAltMinOrNetGainAmt"],
  ["line25", "FilingThresholdAmt"],
  ["line27", "ApplcblCapGainsOrSchDWrkshtAmt"],
  ["line28", "SumThresholdApplcblWrkshtAmt"],
  ["line29", "FlngThrshldLessThesholdSumAmt"],
  ["line30", "SmllrAdjNetGainOrTxblIncAmt"],
  ["line31", "NetAltMinTaxableIncTimesPctAmt"],
  ["line32", "SumOfSmllrAmt"],
  ["line33", "ExcessOfSumAmt"],
  ["line34", "ExcessOfSumTimesPctAmt"],
  ["line35", "TotalNetAmt"],
  ["line36", "NetSmallerSchDOrAdjNetGainAmt"],
  ["line37", "NetSchDOrAdjNetGainTimesPctAmt"],
  ["line38", "SumOfAltMinTaxPercentagesAmt"],
  ["line39", "NetAltMinTxblIncTimesFSPctAmt"],
  ["line40", "TaxOnAlternativeMinimumGainAmt"],
];

function buildIRS6251(fields: Input): string {
  const line7ExceedsLine10 = typeof fields.tentative_tax === "number" &&
    typeof fields.regular_tax === "number" &&
    fields.tentative_tax > fields.regular_tax;
  if (
    (typeof fields.line11_amt !== "number" || fields.line11_amt <= 0) &&
    fields.must_file_for_credit !== true && !line7ExceedsLine10
  ) {
    return "";
  }
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  const hasChildren = children.some((c) => c !== "");
  if (!hasChildren) return "";
  return elements("IRS6251", children);
}

export const form6251: MefFormDescriptor<"form6251", Input> = {
  pendingKey: "form6251",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f6251.pdf",
  build(fields) {
    return buildIRS6251(fields);
  },
};
