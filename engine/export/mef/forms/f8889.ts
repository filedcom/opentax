import { element, elements } from "../xml.ts";
import type { Form8889Fields, Form8889Input } from "../types.ts";

export type { Form8889Input };

// ─── Field Map ────────────────────────────────────────────────────────────────

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8889Fields, string]> = [
  ["taxpayer_hsa_contributions", "HSAContributionAmt"],
  ["employer_hsa_contributions", "HSAEmployerContributionAmt"],
  ["hsa_distributions", "TotalHSADistributionAmt"],
  ["qualified_medical_expenses", "UnreimbQualMedAndDentalExpAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildIRS8889(fields: Form8889Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8889", children);
}
