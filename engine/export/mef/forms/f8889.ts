import { element, elements } from "../xml.ts";

// ─── Local Types ──────────────────────────────────────────────────────────────

interface Form8889Fields {
  taxpayer_hsa_contributions?: number | null;
  employer_hsa_contributions?: number | null;
  hsa_distributions?: number | null;
  qualified_medical_expenses?: number | null;
}

export type Form8889Input = Partial<Form8889Fields> & { [extra: string]: unknown };

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
