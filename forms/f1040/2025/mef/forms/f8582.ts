import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  passive_schedule_c?: number | null;
  passive_schedule_f?: number | null;
  current_income?: number | null;
  current_loss?: number | null;
  prior_unallowed?: number | null;
  modified_agi?: number | null;
  active_participation?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["passive_schedule_c", "PassiveScheduleCIncomeAmt"],
  ["passive_schedule_f", "PassiveScheduleFIncomeAmt"],
  ["current_income", "CurrentYearIncomeAmt"],
  ["current_loss", "CurrentYearLossAmt"],
  ["prior_unallowed", "PriorYearUnallowedLossAmt"],
  ["modified_agi", "ModifiedAGIAmt"],
  ["active_participation", "ActiveParticipationAmt"],
];

function buildIRS8582(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8582", children);
}

export const form8582: MefFormDescriptor<"form8582", Input> = {
  pendingKey: "form8582",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8582.pdf",
  build(fields) {
    return buildIRS8582(fields);
  },
};
