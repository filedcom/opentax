import type { Form6252Fields, Form6252Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// ─── Field Map ────────────────────────────────────────────────────────────────

const FIELD_MAP: ReadonlyArray<readonly [keyof Form6252Fields, string]> = [
  ["selling_price", "SellingPriceAmt"],
  ["gross_profit", "GrossProfitAmt"],
  ["contract_price", "ContractPriceAmt"],
  ["payments_received", "PaymentsReceivedAmt"],
  ["depreciation_recapture", "OrdinaryIncomeAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS6252(fields: Form6252Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS6252", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form6252MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f6252.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS6252(pending.form6252 ?? {});
  }
}

export const form6252 = new Form6252MefNode();
