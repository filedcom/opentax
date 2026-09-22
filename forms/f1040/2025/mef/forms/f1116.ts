import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  foreign_tax_paid?: number | null;
  foreign_income?: number | null;
  total_income?: number | null;
  us_tax_before_credits?: number | null;
  income_category?: string | null;
  category_summaries?: ReadonlyArray<Record<string, unknown>> | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["foreign_tax_paid", "ForeignTaxesPaidOrAccruedAmt"],
  ["foreign_income", "ForeignSourceIncomeAmt"],
  ["total_income", "TotalIncomeAmt"],
  ["us_tax_before_credits", "USTaxBeforeCreditsAmt"],
];

const CATEGORY_CODES: Readonly<Record<string, string>> = {
  section_951a: "951A",
  branch: "FB",
  passive: "PAS",
  general: "GEN",
  section_901j: "901J",
  treaty: "RBT",
};

function buildIRS1116(fields: Input): string {
  // The §904 limitation inputs (lines 3e and 20) are deposited on every return,
  // so they alone are not a Form 1116. Only a foreign tax figure puts the form
  // on the return; the upstream nodes deposit one only when tax was paid.
  if (typeof fields.foreign_tax_paid !== "number") return "";
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  const categoryCode = typeof fields.income_category === "string"
    ? CATEGORY_CODES[fields.income_category]
    : undefined;
  if (categoryCode !== undefined) {
    children.unshift(element("ForeignIncomeCategoryCd", categoryCode));
  }
  return elements("IRS1116", children);
}

export const form1116: MefFormDescriptor<"form_1116", Input> = {
  pendingKey: "form_1116",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1116.pdf",
  build(fields) {
    if (Array.isArray(fields.category_summaries) && fields.category_summaries.length > 0) {
      return fields.category_summaries.map((summary) => buildIRS1116({
        ...fields,
        income_category: typeof summary.category === "string" ? summary.category : undefined,
        foreign_tax_paid: typeof summary.foreignTaxPaid === "number"
          ? summary.foreignTaxPaid
          : undefined,
        foreign_income: typeof summary.foreignGrossIncome === "number"
          ? summary.foreignGrossIncome
          : undefined,
      })).join("");
    }
    return buildIRS1116(fields);
  },
};
