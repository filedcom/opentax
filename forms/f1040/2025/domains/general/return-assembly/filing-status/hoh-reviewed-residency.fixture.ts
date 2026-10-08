import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
export type HohResidence = "ordinary" | "birth" | "death";
const period = (start: string, end: string) => ({
  start_date: start,
  end_date: end,
  record_reference: `Synthetic HOH residence ${start}/${end}`,
  child_lived_with_filer_in_us_verified: true,
});
export function hohReviewedResidencyInputs(
  kind: HohResidence,
  claimEic = true,
) {
  const fixture = pdfReviewFixtures.find((f) =>
    f.id === "hoh-w2-nonclaimed-custodial-release-child"
  )!;
  const inputs = structuredClone(fixture.inputs) as Record<string, unknown>;
  const general = inputs.general as Record<string, unknown>;
  general.do_not_claim_eic = !claimEic;
  general.main_home_in_us_over_half_year = true;
  general.taxpayer_tin_issued_by_due_date = true;
  general.taxpayer_can_be_claimed_as_dependent = false;
  general.taxpayer_ssn_valid_for_employment = true;
  general.taxpayer_ssn_issued_before_due_date = true;
  const child = (general.dependents as Array<Record<string, unknown>>)[0];
  child.months_in_home = kind === "ordinary" ? 6 : 1;
  child.months_lived_with_you_in_us = child.months_in_home;
  if (kind === "ordinary") {
    child.eic_dated_residency_review = {
      child_ssn: "444556666",
      residence_periods: [period("2025-07-02", "2025-12-31")],
    };
  } else {
    child.dob = "2025-12-01";
    if (kind === "birth") {
      child.eic_birth_residency_review = {
        birth_record_reference: "Synthetic HOH December birth",
        us_home_residence_periods: [period("2025-12-01", "2025-12-16")],
        alive_on_2025_12_31_verified: true,
      };
    } else {child.eic_death_residency_review = {
        child_ssn: "444556666",
        birth_record_reference: "Synthetic HOH December birth",
        death_record_reference: "Synthetic HOH December death",
        death_date: "2025-12-10",
        us_home_residence_periods: [period("2025-12-01", "2025-12-06")],
      };}
  }
  if (claimEic) {
    const wage = (inputs.w2 as Array<Record<string, unknown>>)[0];
    Object.assign(wage, {
      box1_wages: 15000,
      box2_fed_withheld: 1500,
      box3_ss_wages: 15000,
      box4_ss_withheld: 930,
      box5_medicare_wages: 15000,
      box6_medicare_withheld: 217.5,
    });
  }
  return inputs;
}
