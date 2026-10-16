import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
export const sstbStatusCases = (["hoh", "qss"] as const).flatMap((status) =>
  [true, false].map((payroll) => ({
    status,
    payroll,
    name: `${status}-${payroll ? "payroll" : "owner-only"}`,
  }))
);
export function sstbStatusFixture(c: typeof sstbStatusCases[number]) {
  const business = pdfReviewFixtures.find((f) =>
    f.id ===
      (c.payroll
        ? "single-form8995a-accounting-sstb-phasein"
        : "single-form8995a-accounting-sstb-no-payroll")
  )!;
  const household = pdfReviewFixtures.find((f) =>
    f.id ===
      (c.status === "hoh"
        ? "hoh-w2-nonclaimed-custodial-release-child"
        : "qss-w2-nonclaimed-joint-return-child")
  )!;
  const input: Record<string, any> = structuredClone(business.inputs);
  input.general = {
    ...structuredClone(household.inputs.general as Record<string, unknown>),
    taxpayer_first_name: input.general.taxpayer_first_name,
    taxpayer_last_name: input.general.taxpayer_last_name,
    taxpayer_ssn: input.general.taxpayer_ssn,
    taxpayer_dob: input.general.taxpayer_dob,
    digital_assets: false,
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
    qbi_not_patron_of_specified_cooperative_confirmed: true,
  };
  return input;
}
