import type { Form8582Fields, Form8582Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form8582Fields, string]> = [
  ["passive_schedule_c", "PassiveScheduleCIncomeAmt"],
  ["passive_schedule_f", "PassiveScheduleFIncomeAmt"],
  ["current_income", "CurrentYearIncomeAmt"],
  ["current_loss", "CurrentYearLossAmt"],
  ["prior_unallowed", "PriorYearUnallowedLossAmt"],
  ["modified_agi", "ModifiedAGIAmt"],
  ["active_participation", "ActiveParticipationAmt"],
];

function buildIRS8582(fields: Form8582Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8582", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8582MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8582.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8582(pending.form8582 ?? {});
  }
}

export const form8582 = new Form8582MefNode();
