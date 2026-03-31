import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  ee_bond_interest?: number | null;
  bond_proceeds?: number | null;
  qualified_expenses?: number | null;
  modified_agi?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["ee_bond_interest", "SavingsBondInterestAmt"],
  ["bond_proceeds", "TotalProceedsAmt"],
  ["qualified_expenses", "QualifiedExpensesAmt"],
  ["modified_agi", "ModifiedAGIAmt"],
];

function buildIRS8815(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8815", children);
}

export const form8815: MefFormDescriptor<"form8815", Input> = {
  pendingKey: "form8815",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8815.pdf",
  build(fields) {
    return buildIRS8815(fields);
  },
};
