import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  selling_price?: number | null;
  gross_profit?: number | null;
  contract_price?: number | null;
  payments_received?: number | null;
  depreciation_recapture?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["selling_price", "SellingPriceAmt"],
  ["gross_profit", "GrossProfitAmt"],
  ["contract_price", "ContractPriceAmt"],
  ["payments_received", "PaymentsReceivedAmt"],
  ["depreciation_recapture", "OrdinaryIncomeAmt"],
];

function buildIRS6252(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS6252", children);
}

export const form6252: MefFormDescriptor<"form6252", Input> = {
  pendingKey: "form6252",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f6252.pdf",
  build(fields) {
    return buildIRS6252(fields);
  },
};
