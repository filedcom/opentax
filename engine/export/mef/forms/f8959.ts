import { element, elements } from "../xml.ts";

interface Form8959Fields {
  medicare_wages?: number | null;
  unreported_tips?: number | null;
  wages_8919?: number | null;
  se_income?: number | null;
  rrta_wages?: number | null;
  medicare_withheld?: number | null;
  rrta_medicare_withheld?: number | null;
}

type Form8959Input = Record<string, unknown>;

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8959Fields, string]> = [
  ["medicare_wages", "TotalW2MedicareWagesAndTipsAmt"],
  ["unreported_tips", "TotalUnreportedMedicareTipsAmt"],
  ["wages_8919", "TotalWagesWithNoWithholdingAmt"],
  ["se_income", "TotalSelfEmploymentIncomeAmt"],
  ["rrta_wages", "TotalRailroadRetirementCompAmt"],
  ["medicare_withheld", "TotalW2MedicareTaxWithheldAmt"],
  ["rrta_medicare_withheld", "TotalW2AddlRRTTaxAmt"],
];

export function buildIRS8959(fields: Form8959Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8959", children);
}
