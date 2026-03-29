import type { Form8960Fields, Form8960Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


const FIELD_MAP: ReadonlyArray<readonly [keyof Form8960Fields, string]> = [
  ["line1_taxable_interest", "TaxableInterestAmt"],
  ["line2_ordinary_dividends", "OrdinaryDividendsAmt"],
  ["line3_annuities", "AnnuitesFromNonQlfPlansAmt"],
  ["line4a_passive_income", "NetRentalIncomeOrLossAmt"],
  ["line4b_rental_net", "AdjNetIncmOrLossNonSect1411Amt"],
  ["line5a_net_gain", "PropertyDisposGainOrLossAmt"],
  ["line5b_net_gain_adjustment", "NonNIITPropDisposGainOrLossAmt"],
  ["line7_other_modifications", "OtherInvestmentIncomeOrLossAmt"],
  ["line9a_investment_interest_expense", "InvestmentInterestAmt"],
  ["line9b_state_local_tax", "StateLocalForeignIncomeTaxAmt"],
  ["line10_additional_modifications", "AdditionalModificationAmt"],
];

function buildIRS8960(fields: Form8960Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8960", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8960MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8960.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8960(pending.form8960 ?? {});
  }
}

export const form8960 = new Form8960MefNode();
