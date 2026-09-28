import {
  type Form7206Lines,
  type SingleScheduleCPlan,
  singleScheduleCPlanSchema,
} from "../../../nodes/intermediate/forms/form7206/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<
  Form7206Lines & {
    single_schedule_c_plan: SingleScheduleCPlan;
  }
>;

// TY2025 v5.4 IRS7206.xsd sequence. Line 11 is blank for a Schedule C plan.
export const FIELD_MAP: ReadonlyArray<readonly [keyof Form7206Lines, string]> =
  [
    ["line1", "TotalHealthInsurancePaidAmt"],
    ["line2", "TotQlfyLTCareInsDedAmt"],
    ["line3", "TotHlthInsQlfyLTCareInsDedAmt"],
    ["line4", "NetPrftOthEarnedIncmAmt"],
    ["line5", "TotNetPrftIncmAmt"],
    ["line6", "OthEarnedIncmDivTotNetPrftPct"],
    ["line7", "DedSETaxMultiplyPctAmt"],
    ["line8", "PctLessNetPrftOthEarnedIncmAmt"],
    ["line9", "SelfEmpldSepSimpleQlfyPlansAmt"],
    ["line10", "PctMinusSEQlfyPlansAmt"],
    ["line12", "Form2555Amt"],
    ["line13", "SubtractForm2555Amt"],
    ["line14", "SelfEmpldHealthInsDedAmt"],
  ];

function buildIRS7206(fields: Input): string {
  if (Object.keys(fields).length === 0) return "";
  singleScheduleCPlanSchema.parse(fields.single_schedule_c_plan);
  throw new Error(
    "Form 7206 one-plan MeF filing needs primary premium-month, business-owner, and return deduction reconciliation",
  );
}

export const form7206: MefFormDescriptor<"form7206", Input> = {
  pendingKey: "form7206",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f7206--2025.pdf",
  build: buildIRS7206,
};
