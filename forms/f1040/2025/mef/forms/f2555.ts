import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  foreign_wages?: number | null;
  foreign_self_employment_income?: number | null;
  days_in_foreign_country?: number | null;
  foreign_housing_expenses?: number | null;
  employer_housing_exclusion?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["foreign_wages", "ForeignEarnedIncWagesAmt"],
  ["foreign_self_employment_income", "ForeignEarnedIncSelfEmplAmt"],
  ["days_in_foreign_country", "PhysicalPresenceDaysCnt"],
  ["foreign_housing_expenses", "ForeignHousingExpensesAmt"],
  ["employer_housing_exclusion", "EmployerHousingExclusionAmt"],
];

function buildIRS2555(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS2555", children);
}

export const form2555: MefFormDescriptor<"form2555", Input> = {
  pendingKey: "form2555",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f2555.pdf",
  build(fields) {
    return buildIRS2555(fields);
  },
};
