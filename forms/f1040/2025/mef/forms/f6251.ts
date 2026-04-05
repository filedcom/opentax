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
  other_adjustments?: number | null;
  amtftc?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Tag names verified against IRS6251.xsd (2025v3.0).
// - regular_tax_income → AlternativeMinTaxableIncomeAmt (the AMTI line)
// - regular_tax → AdjustedRegularTaxAmt (regular tax after certain credits)
// - iso_adjustment → IncentiveStockOptionsAmt (line 2b preference)
// - depreciation_adjustment → DepreciationAmt (line 2l preference)
// - nol_adjustment → AltTaxNetOperatingLossDedAmt (line 2f preference)
// - private_activity_bond_interest → ExemptPrivateActivityBondsAmt (line 2g preference)
// - other_adjustments → RelatedAdjustmentAmt (catch-all adjustment)
// - amtftc → AMTForeignTaxCreditAmt (line 32, already correct)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["iso_adjustment", "IncentiveStockOptionsAmt"],
  ["depreciation_adjustment", "DepreciationAmt"],
  ["nol_adjustment", "AltTaxNetOperatingLossDedAmt"],
  ["private_activity_bond_interest", "ExemptPrivateActivityBondsAmt"],
  ["other_adjustments", "RelatedAdjustmentAmt"],
  ["regular_tax_income", "AlternativeMinTaxableIncomeAmt"],
  ["regular_tax", "AdjustedRegularTaxAmt"],
  ["amtftc", "AMTForeignTaxCreditAmt"],
];

// Only emit IRS6251 when there are actual preference items or adjustments.
// regular_tax_income and regular_tax are always written by upstream nodes for
// computation purposes, so the presence of adjustment items is the signal that
// this form is truly applicable to the return.
function hasAdjustmentOrPreference(fields: Input): boolean {
  const adjustmentKeys: Array<keyof Fields> = [
    "iso_adjustment",
    "depreciation_adjustment",
    "nol_adjustment",
    "private_activity_bond_interest",
    "qsbs_adjustment",
    "other_adjustments",
    "amtftc",
  ];
  return adjustmentKeys.some((k) => typeof fields[k] === "number" && (fields[k] as number) !== 0);
}

function buildIRS6251(fields: Input): string {
  // Only emit when this form is meaningful (non-zero preferences/adjustments).
  // Prevents emitting invalid XML for returns where AMT has 0 impact.
  if (!hasAdjustmentOrPreference(fields)) return "";
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
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
