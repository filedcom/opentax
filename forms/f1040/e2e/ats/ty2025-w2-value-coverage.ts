import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  SCENARIO_1040_01_FACTS,
  SCENARIO_1040_02_FACTS,
  SCENARIO_1040_04_FACTS,
  SCENARIO_1040_05_FACTS,
  SCENARIO_1040_12_FACTS,
  SCENARIO_1040_13_FACTS,
} from "./ty2025_cases.ts";

interface IssuedW2 {
  employerName: string;
  employerEin: string;
  employeeSsn: string;
  box1Wages: number;
  box2FederalWithholding: number;
  box3SocialSecurityWages: number;
  box4SocialSecurityWithholding: number;
  box5MedicareWages: number;
  box6MedicareWithholding: number;
  statutoryEmployee?: boolean;
  retirementPlanChecked?: boolean;
}
export interface W2Target {
  sourcePage: number;
  employerName: string;
  fields: Readonly<Record<string, string | number | boolean>>;
}
const target = (source: IssuedW2, sourcePage: number): W2Target => ({
  sourcePage,
  employerName: source.employerName,
  fields: {
    EmployeeSSN: source.employeeSsn,
    EmployerEIN: source.employerEin,
    WagesAmt: source.box1Wages,
    WithholdingAmt: source.box2FederalWithholding,
    SocialSecurityWagesAmt: source.box3SocialSecurityWages,
    SocialSecurityTaxAmt: source.box4SocialSecurityWithholding,
    MedicareWagesAndTipsAmt: source.box5MedicareWages,
    MedicareTaxWithheldAmt: source.box6MedicareWithholding,
    // All eight issued pages visually reviewed; their unmarked boxes are known.
    StatutoryEmployeeInd: source.statutoryEmployee ?? false,
    RetirementPlanInd: source.retirementPlanChecked ?? false,
  },
});

/** Independently reviewed issued pages, not amounts taken from executor output. */
export const ATS_W2_TARGETS: Readonly<Record<string, readonly W2Target[]>> = {
  "1040-01": SCENARIO_1040_01_FACTS.w2.map((s, i) => target(s, i + 4)),
  "1040-02": SCENARIO_1040_02_FACTS.w2.map((s, i) => target(s, i + 4)),
  "1040-04": [target(SCENARIO_1040_04_FACTS.w2, 4)],
  "1040-05": [target(SCENARIO_1040_05_FACTS.w2, 4)],
  "1040-12": [target(SCENARIO_1040_12_FACTS.w2, 15)],
  "1040-13": [target(SCENARIO_1040_13_FACTS.w2, 9)],
};
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const name = (v: unknown) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, " ").toUpperCase() : null;
const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  removeNSPrefix: true,
});
type Result =
  | "match"
  | "different"
  | "not-evaluated"
  | "invalid-xml"
  | "missing-copy"
  | "ambiguous-copy"
  | "missing-field"
  | "invalid-value";

/** Match whole copies by reviewed employer name; never pair fields separately
 * or use order, wage amounts, recipient identity, or EIN to force a match.
 * Duplicate names are ambiguous, including identical duplicate copies.
 */
export function compareAtsW2Values(
  xml: string | null,
  targets: readonly W2Target[],
) {
  let copies: unknown[] | undefined;
  if (xml !== null && XMLValidator.validate(xml) === true) {
    const parsed = parser.parse(xml);
    if (record(parsed.Return) && record(parsed.Return.ReturnData)) {
      const raw = parsed.Return.ReturnData.IRSW2;
      copies = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
    }
  }
  const rows = targets.flatMap((t) => {
    const found = copies?.filter((copy) => {
      if (!record(copy) || !record(copy.EmployerName)) return false;
      const first = copy.EmployerName.BusinessNameLine1Txt;
      const second = copy.EmployerName.BusinessNameLine2Txt;
      if (
        typeof first !== "string" ||
        (second !== undefined && typeof second !== "string")
      ) return false;
      return name([first, second].filter((v) => v !== undefined).join(" ")) ===
        name(t.employerName);
    }) ?? [];
    return Object.entries(t.fields).map(([field, expected]) => {
      let result: Result;
      let actual: string | number | boolean | null = null;
      const copy = found[0];
      if (xml === null) result = "not-evaluated";
      else if (!copies) result = "invalid-xml";
      else if (!found.length) result = "missing-copy";
      else if (found.length !== 1) result = "ambiguous-copy";
      else {
        const value = record(copy) ? copy[field] : undefined;
        if (typeof expected === "boolean") {
          // CheckboxType is X when selected; absence on an existing copy is false.
          actual = value === undefined ? false : value === "X" ? true : null;
        } else if (typeof expected === "string") {
          actual = typeof value === "string" && /^\d{9}$/.test(value)
            ? value
            : null;
        } else if (
          typeof value === "string" && /^-?\d+$/.test(value) &&
          Number.isSafeInteger(Number(value))
        ) {
          actual = Number(value);
        }
        result = value === undefined && typeof expected !== "boolean"
          ? "missing-field"
          : actual === null
          ? "invalid-value"
          : actual === expected
          ? "match"
          : "different";
      }
      return {
        sourcePage: t.sourcePage,
        employerName: t.employerName,
        field,
        expected,
        actual,
        result,
      };
    });
  });
  return {
    scope:
      "Issued W-2 copy identities, six amounts and two indicators; employer name locates a unique copy. No address, state, PDF, business-rule or IRS-acceptance claim.",
    rows,
  };
}
