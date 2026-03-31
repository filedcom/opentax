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

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["regular_tax_income", "RegularTaxIncomeAmt"],
  ["regular_tax", "RegularTaxAmt"],
  ["iso_adjustment", "ISOAdjustmentAmt"],
  ["depreciation_adjustment", "DepreciationAdjustmentAmt"],
  ["nol_adjustment", "NOLAdjustmentAmt"],
  ["private_activity_bond_interest", "PrivateActivityBondIntAmt"],
  ["qsbs_adjustment", "QSBSAdjustmentAmt"],
  ["line2a_taxes_paid", "TaxesPaidAmt"],
  ["other_adjustments", "OtherAdjustmentsAmt"],
  ["amtftc", "AMTForeignTaxCreditAmt"],
];

function buildIRS6251(fields: Input): string {
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
