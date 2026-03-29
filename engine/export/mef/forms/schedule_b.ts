import { element, elements } from "../xml.ts";
import type { ScheduleBFields, ScheduleBInput } from "../types.ts";

const FIELD_MAP: ReadonlyArray<readonly [keyof ScheduleBFields, string]> = [
  ["taxable_interest_net", "TotalInterestAmt"],
  ["ee_bond_exclusion", "ExcludibleSavingsBondIntAmt"],
  ["ordinaryDividends", "TotalOrdinaryDividendsAmt"],
];

export function buildIRS1040ScheduleB(fields: ScheduleBInput): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040ScheduleB", children);
}
