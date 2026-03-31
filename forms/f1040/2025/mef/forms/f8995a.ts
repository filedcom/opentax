import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  taxable_income?: number | null;
  net_capital_gain?: number | null;
  qbi?: number | null;
  w2_wages?: number | null;
  unadjusted_basis?: number | null;
  sstb_qbi?: number | null;
  sstb_w2_wages?: number | null;
  sstb_unadjusted_basis?: number | null;
  line6_sec199a_dividends?: number | null;
  qbi_loss_carryforward?: number | null;
  reit_loss_carryforward?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["taxable_income", "TaxableIncomeAmt"],
  ["net_capital_gain", "NetCapitalGainAmt"],
  ["qbi", "QualifiedBusinessIncomeAmt"],
  ["w2_wages", "W2WagesAmt"],
  ["unadjusted_basis", "UnadjustedBasisAmt"],
  ["sstb_qbi", "SSTBQBIAmt"],
  ["sstb_w2_wages", "SSTBW2WagesAmt"],
  ["sstb_unadjusted_basis", "SSTBUnadjustedBasisAmt"],
  ["line6_sec199a_dividends", "Section199ADividendsAmt"],
  ["qbi_loss_carryforward", "QBILossCarryforwardAmt"],
  ["reit_loss_carryforward", "REITLossCarryforwardAmt"],
];

function buildIRS8995A(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8995A", children);
}

export const form8995a: MefFormDescriptor<"form8995a", Input> = {
  pendingKey: "form8995a",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8995a.pdf",
  build(fields) {
    return buildIRS8995A(fields);
  },
};
