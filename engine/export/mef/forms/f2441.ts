import { element, elements } from "../xml.ts";

// ─── Local Types ──────────────────────────────────────────────────────────────

interface Form2441Fields {
  dep_care_benefits?: number | null;
}

export type Form2441Input = Partial<Form2441Fields> & { [extra: string]: unknown };

// ─── Field Map ────────────────────────────────────────────────────────────────

const FIELD_MAP: ReadonlyArray<readonly [keyof Form2441Fields, string]> = [
  ["dep_care_benefits", "DependentCareBenefitsAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildIRS2441(fields: Form2441Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS2441", children);
}
