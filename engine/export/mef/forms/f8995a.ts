import { element, elements } from "../xml.ts";

interface Form8995AFields {
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
type Form8995AInput = Partial<Form8995AFields> & { [extra: string]: unknown };

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8995AFields, string]> = [
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

export function buildIRS8995A(fields: Form8995AInput): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8995A", children);
}
