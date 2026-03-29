import type { Form8995Fields, Form8995Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8995Fields, string]> = [
  ["qbi_from_schedule_c", "QBIFromScheduleCAmt"],
  ["qbi_from_schedule_f", "QBIFromScheduleFAmt"],
  ["qbi", "QualifiedBusinessIncomeAmt"],
  ["w2_wages", "W2WagesAmt"],
  ["unadjusted_basis", "UnadjustedBasisAmt"],
  ["line6_sec199a_dividends", "Section199ADividendsAmt"],
  ["taxable_income", "TaxableIncomeAmt"],
  ["net_capital_gain", "NetCapitalGainAmt"],
  ["qbi_loss_carryforward", "QBILossCarryforwardAmt"],
  ["reit_loss_carryforward", "REITLossCarryforwardAmt"],
];

function buildIRS8995(fields: Form8995Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8995", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8995MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8995.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8995(pending.form8995 ?? {});
  }
}

export const form8995 = new Form8995MefNode();
