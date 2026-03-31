import type { Form6251Fields, Form6251Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form6251Fields, string]> = [
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

function buildIRS6251(fields: Form6251Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS6251", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form6251MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f6251.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS6251(pending.form6251 ?? {});
  }
}

export const form6251 = new Form6251MefNode();
