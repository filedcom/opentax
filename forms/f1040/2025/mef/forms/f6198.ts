import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  schedule_c_loss?: number | null;
  schedule_f_loss?: number | null;
  prior_unallowed?: number | null;
  current_year_income?: number | null;
  amount_at_risk?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["schedule_c_loss", "OrdinaryLossAmt"],
  ["schedule_f_loss", "FarmLossAmt"],
  ["prior_unallowed", "PriorYearUnallowedLossAmt"],
  ["current_year_income", "CurrentYrIncomeAmt"],
  ["amount_at_risk", "AmountAtRiskAmt"],
];

function buildIRS6198(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS6198", children);
}

export const form6198: MefFormDescriptor<"form6198", Input> = {
  pendingKey: "form6198",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f6198.pdf",
  build(fields) {
    return buildIRS6198(fields);
  },
};
