import type { Form8995Fields, Form8995Input } from "../types.ts";
import { element, elements } from "../xml.ts";

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

export function buildIRS8995(fields: Form8995Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8995", children);
}
