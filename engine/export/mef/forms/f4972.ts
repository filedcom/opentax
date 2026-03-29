import { element, elements } from "../xml.ts";
import type { Form4972Fields, Form4972Input } from "../types.ts";
export type { Form4972Input };

const FIELD_MAP: ReadonlyArray<readonly [keyof Form4972Fields, string]> = [
  ["lump_sum_amount", "LumpSumDistriAmt"],
  ["capital_gain_amount", "CapitalGainAmt"],
  ["death_benefit_exclusion", "DeathBenefitExclusionAmt"],
];

export function buildIRS4972(fields: Form4972Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4972", children);
}
