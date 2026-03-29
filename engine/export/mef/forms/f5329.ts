import { element, elements } from "../xml.ts";

interface Form5329Fields {
  early_distribution?: number | null;
  simple_ira_early_distribution?: number | null;
  esa_able_distribution?: number | null;
  excess_traditional_ira?: number | null;
  traditional_ira_value?: number | null;
  excess_roth_ira?: number | null;
  roth_ira_value?: number | null;
  excess_coverdell_esa?: number | null;
  coverdell_esa_value?: number | null;
  excess_archer_msa?: number | null;
  archer_msa_value?: number | null;
  excess_hsa?: number | null;
  hsa_value?: number | null;
  excess_able?: number | null;
  able_value?: number | null;
}
type Form5329Input = Partial<Form5329Fields> & { [extra: string]: unknown };

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
