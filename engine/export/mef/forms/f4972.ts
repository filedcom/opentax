import { element, elements } from "../xml.ts";

interface Form4972Fields {
  lump_sum_amount?: number | null;
  capital_gain_amount?: number | null;
  death_benefit_exclusion?: number | null;
}

export type Form4972Input = Partial<Form4972Fields> & { [extra: string]: unknown };

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
