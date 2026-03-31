import { element, elements } from "../../../mef/xml.ts";
import type { Form4972Fields, Form4972Input } from "../types.ts";

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form4972Fields, string]> = [
  ["lump_sum_amount", "LumpSumDistriAmt"],
  ["capital_gain_amount", "CapitalGainAmt"],
  ["death_benefit_exclusion", "DeathBenefitExclusionAmt"],
];

function buildIRS4972(fields: Form4972Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4972", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form4972MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f4972.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS4972(pending.form4972 ?? {});
  }
}

export const form4972 = new Form4972MefNode();
