import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  qbi_from_schedule_c?: number | null;
  qbi_from_schedule_f?: number | null;
  qbi?: number | null;
  w2_wages?: number | null;
  unadjusted_basis?: number | null;
  line6_sec199a_dividends?: number | null;
  taxable_income?: number | null;
  net_capital_gain?: number | null;
  qbi_loss_carryforward?: number | null;
  reit_loss_carryforward?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
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

function buildIRS8995(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8995", children);
}

export const form8995: MefFormDescriptor<"form8995", Input> = {
  pendingKey: "form8995",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8995.pdf",
  build(fields) {
    return buildIRS8995(fields);
  },
};
