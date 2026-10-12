import { compareAtsIssuedCopyValues } from "./ty2025-issued-copy-values.ts";
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
export function compareAtsW2Values(
  xml: string | null,
  targets: readonly W2Target[],
) {
  const rows = compareAtsIssuedCopyValues(
    xml,
    targets.map((t) => ({ ...t, copyName: t.employerName })),
    {
      root: "IRSW2",
      nameField: "EmployerName",
      stringPatterns: { EmployeeSSN: /^\d{9}$/, EmployerEIN: /^\d{9}$/ },
    },
  ).map(({ copyName, ...row }) => ({ ...row, employerName: copyName }));
  return {
    scope:
      "Issued W-2 copy identities, six amounts and two indicators; employer name locates a unique copy. No address, state, PDF, business-rule or IRS-acceptance claim.",
    rows,
  };
}
