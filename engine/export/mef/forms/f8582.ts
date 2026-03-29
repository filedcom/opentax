import { element, elements } from "../xml.ts";

interface Form8582Fields {
  passive_schedule_c?: number | null;
  passive_schedule_f?: number | null;
  current_income?: number | null;
  current_loss?: number | null;
  prior_unallowed?: number | null;
  modified_agi?: number | null;
  active_participation?: number | null;
}

type Form8582Input = Partial<Form8582Fields> & { [extra: string]: unknown };

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8582Fields, string]> = [
  ["passive_schedule_c", "PassiveScheduleCIncomeAmt"],
  ["passive_schedule_f", "PassiveScheduleFIncomeAmt"],
  ["current_income", "CurrentYearIncomeAmt"],
  ["current_loss", "CurrentYearLossAmt"],
  ["prior_unallowed", "PriorYearUnallowedLossAmt"],
  ["modified_agi", "ModifiedAGIAmt"],
  ["active_participation", "ActiveParticipationAmt"],
];

export function buildIRS8582(fields: Form8582Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8582", children);
}
