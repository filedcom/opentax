import { z } from "zod";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { w2ItemSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { inputSchema as bondSchema } from "../../../../../nodes/intermediate/forms/income/investments/form8815/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";

export const institutionCases = [
  "three",
  "four-phaseout",
  "twelve",
  "joint-four",
] as const;

export function institutionInputs(kind: typeof institutionCases[number]) {
  const base = pdfReviewFixtures.find((row) =>
    row.id === "single-form8815-series-ee-bond-exclusion"
  )!;
  const general = generalSchema.parse(base.inputs.general);
  const [w2] = z.array(w2ItemSchema).parse(base.inputs.w2);
  const bond = bondSchema.parse(base.inputs.form8815);
  const joint = kind === "joint-four";
  const partial = joint || kind === "four-phaseout";
  const wages = joint ? 160000 : partial ? 100000 : 70000;
  const count = kind === "three" ? 3 : kind === "twelve" ? 12 : 4;
  const filingStatus = joint ? FilingStatus.MFJ : FilingStatus.Single;
  const eligibleStudents = Array.from({ length: count }, (_, i) => ({
    person_name: joint && i % 2 === 1 ? "Morgan Example" : "Alex Example",
    institution_name: i === 3 && kind === "twelve"
      ? "W".repeat(75)
      : `Example College ${String(i + 1).padStart(2, "0")}`,
    institution_address: {
      line1: `${i + 1} College Avenue`,
      ...(kind === "twelve"
        ? { line2: "Continuing Education Department" }
        : {}),
      city: "Boston",
      state: "MA",
      zip: "02108-1234",
    },
  }));
  return {
    ...base.inputs,
    general: {
      ...general,
      filing_status: filingStatus,
      ...(joint
        ? {
          spouse_first_name: "Morgan",
          spouse_last_name: "Example",
          spouse_ssn: "222-33-4444",
          spouse_dob: "1981-04-10",
        }
        : {}),
    },
    w2: [{
      ...w2,
      box1_wages: wages,
      box3_ss_wages: wages,
      box4_ss_withheld: wages * .062,
      box5_medicare_wages: wages,
      box6_medicare_withheld: wages * .0145,
    }],
    form8815: {
      ...bond,
      eligible_students: eligibleStudents,
      filing_status: filingStatus,
      line2_qualified_education_expenses: partial ? 8000 : 15000,
      line3_nontaxable_education_benefits: partial ? 2000 : 0,
      line9_worksheet: {
        ...bond.line9_worksheet,
        other_1040_and_schedule1_income: wages,
      },
    },
  };
}
