import type { Form5329Fields, Form5329Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

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

function buildIRS5329(fields: Form5329Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS5329", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form5329MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f5329.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS5329(pending.form5329 ?? {});
  }
}

export const form5329 = new Form5329MefNode();
