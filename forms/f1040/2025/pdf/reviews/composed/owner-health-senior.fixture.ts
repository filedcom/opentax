import { independentHealthInputs } from "../health/form7206-independent-owner.fixture.ts";
import { jointTipHealthInputs } from "./qualified-tip-health.fixture.ts";
import { businessTipSourceInputs } from "./business-tip-source.fixture.ts";
export function ownerHealthSeniorInputs(
  mode: "one-full" | "both-full" | "one-phase" | "both-phase" | "tips-phase",
) {
  const inputs = mode === "tips-phase"
    ? jointTipHealthInputs("healthlimited")
    : independentHealthInputs();
  const both = mode.startsWith("both");
  Object.assign(inputs.general, {
    taxpayer_dob: "1950-01-01",
    taxpayer_tin_issued_by_due_date: true,
    taxpayer_ssn_valid_for_employment: true,
    taxpayer_ssn_issued_before_due_date: true,
    spouse_dob: both ? "1950-01-01" : "1970-01-01",
    spouse_tin_issued_by_due_date: true,
    spouse_ssn_valid_for_employment: true,
    spouse_ssn_issued_before_due_date: true,
  });
  inputs.schedule1a ??= {};
  inputs.schedule1a.senior_zero_exclusions_review =
    (businessTipSourceInputs() as any).schedule1a.senior_zero_exclusions_review;
  if (mode.endsWith("full")) {
    delete inputs.w2;
    for (const b of inputs.schedule_c) {
      b.line_1_gross_receipts = b.business_reference === "BIZ-T"
        ? 80000
        : 40000;
    }
    for (const copy of inputs.f1099nec) {
      copy.box1_nec = copy.schedule_c_business_reference === "BIZ-T"
        ? 80000
        : 40000;
    }
  }
  return inputs;
}
export const ownerHealthSeniorModes = [
  "one-full",
  "both-full",
  "one-phase",
  "both-phase",
  "tips-phase",
] as const;
