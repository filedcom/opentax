import type { Form5329Fields, Form5329Input } from "../types.ts";
import { element, elements } from "../xml.ts";

const FIELD_MAP: ReadonlyArray<readonly [keyof Form5329Fields, string]> = [
  ["early_distribution", "EarlyDistributionAmt"],
  ["simple_ira_early_distribution", "SimpleIRAEarlyDistriAmt"],
  ["esa_able_distribution", "ESAABLEDistributionAmt"],
  ["excess_traditional_ira", "ExcessContriTradIRAAmt"],
  ["traditional_ira_value", "TraditionalIRAValueAmt"],
  ["excess_roth_ira", "ExcessContriRothIRAAmt"],
  ["roth_ira_value", "RothIRAValueAmt"],
  ["excess_coverdell_esa", "ExcessContriCoverdellESAAmt"],
  ["coverdell_esa_value", "CoverdellESAValueAmt"],
  ["excess_archer_msa", "ExcessContriArcherMSAAmt"],
  ["archer_msa_value", "ArcherMSAValueAmt"],
  ["excess_hsa", "ExcessContriHSAAmt"],
  ["hsa_value", "HSAValueAmt"],
  ["excess_able", "ExcessContriABLEAmt"],
  ["able_value", "ABLEAccountValueAmt"],
];

export function buildIRS5329(fields: Form5329Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS5329", children);
}
