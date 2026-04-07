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
// Element order matches the XSD sequence (required for validation).
// - regular_tax_income → AGIOrAGILessDeductionAmt  (line 1)
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
  ["regular_tax_income", "AGIOrAGILessDeductionAmt"],
  ["line2a_taxes_paid", "ScheduleATaxesAmt"],
  ["nol_adjustment", "AltTaxNetOperatingLossDedAmt"],
  ["private_activity_bond_interest", "ExemptPrivateActivityBondsAmt"],
  ["qsbs_adjustment", "Section1202ExclusionAmt"],
  ["iso_adjustment", "IncentiveStockOptionsAmt"],
  ["depreciation_adjustment", "DepreciationAmt"],
  ["other_adjustments", "RelatedAdjustmentAmt"],
  ["amtftc", "AMTForeignTaxCreditAmt"],
  ["regular_tax", "AdjustedRegularTaxAmt"],
];

function buildIRS6251(fields: Input): string {
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
