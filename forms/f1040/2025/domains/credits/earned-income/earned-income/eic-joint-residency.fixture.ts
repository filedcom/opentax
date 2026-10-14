import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
export type ResidencyKind = "ordinary" | "birth" | "death";
export type WageOwner = "primary" | "spouse" | "split";
const period = (start: string, end: string) => ({
  start_date: start,
  end_date: end,
  record_reference: `Synthetic joint residence ${start}/${end}`,
  child_lived_with_filer_in_us_verified: true as const,
});
export function jointResidencyInputs(
  kind: ResidencyKind,
  wageOwner: WageOwner,
) {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-w2-three-eic-children-with-reviewed-birth"
  )!;
  const inputs = structuredClone(fixture.inputs) as Record<string, unknown>;
  const general = inputs.general as Record<string, unknown>;
  Object.assign(general, {
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Sam",
    spouse_last_name: "Example",
    spouse_ssn: "444556666",
    spouse_dob: "1987-03-10",
    spouse_ssn_valid_for_employment: true,
    spouse_ssn_issued_before_due_date: true,
    spouse_tin_issued_by_due_date: true,
    spouse_can_be_claimed_as_dependent: false,
  });
  const deps = general.dependents as Array<Record<string, unknown>>;
  if (kind === "ordinary") {
    Object.assign(deps[0], {
      months_in_home: 6,
      months_lived_with_you_in_us: 6,
      eic_dated_residency_review: {
        child_ssn: "111223334",
        residence_periods: [period("2025-07-02", "2025-12-31")],
      },
    });
  } else if (kind === "birth") {
    Object.assign(deps[2], {
      eic_birth_residency_review: {
        birth_record_reference: "Synthetic December1 birth",
        us_home_residence_periods: [
          period("2025-12-24", "2025-12-31"),
          period("2025-12-01", "2025-12-08"),
        ],
        alive_on_2025_12_31_verified: true,
      },
    });
  } else {Object.assign(deps[2], {
      eic_birth_residency_review: undefined,
      eic_death_residency_review: {
        child_ssn: "111223336",
        birth_record_reference: "Synthetic December1 birth",
        death_record_reference: "Synthetic December10 death",
        death_date: "2025-12-10",
        us_home_residence_periods: [period("2025-12-01", "2025-12-06")],
      },
    });}
  const original = (inputs.w2 as Array<Record<string, unknown>>)[0];
  if (wageOwner === "spouse") {
    inputs.w2 = [{ ...original, employee_ssn: "444556666" }];
  }
  if (wageOwner === "split") {
    inputs.w2 = [{
      ...original,
      box1_wages: 7500,
      box2_fed_withheld: 750,
      box3_ss_wages: 7500,
      box4_ss_withheld: 465,
      box5_medicare_wages: 7500,
      box6_medicare_withheld: 108.75,
    }, {
      ...original,
      employee_ssn: "444556666",
      employer_name: "Other Example Employer",
      employer_ein: "98-7654321",
      box1_wages: 7500,
      box2_fed_withheld: 750,
      box3_ss_wages: 7500,
      box4_ss_withheld: 465,
      box5_medicare_wages: 7500,
      box6_medicare_withheld: 108.75,
    }];
  }
  inputs.f8812 = (inputs.f8812 as Array<Record<string, unknown>>).map(
    (row) => ({ ...row, filing_status: FilingStatus.MFJ }),
  );
  return inputs;
}
