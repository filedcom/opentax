import { element, elements } from "../xml.ts";

interface Form6251Fields {
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
type Form6251Input = Partial<Form6251Fields> & { [extra: string]: unknown };

const FIELD_MAP: ReadonlyArray<readonly [keyof Form6251Fields, string]> = [
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

export function buildIRS6251(fields: Form6251Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS6251", children);
}
