import {
  type HohResidence,
  hohReviewedResidencyInputs,
} from "./hoh-reviewed-residency.fixture.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
export type SeparationBasis = "last_six_months_apart" | "legal_separation";
export function mfsResidencyInputs(
  kind: HohResidence,
  basis: SeparationBasis,
  claimed: boolean,
) {
  const inputs = hohReviewedResidencyInputs(kind);
  const general = inputs.general as Record<string, unknown>;
  delete general.hoh_qualifying_person_name;
  delete general.hoh_qualifying_person_relationship;
  delete general.hoh_paid_more_than_half_home_costs;
  Object.assign(general, {
    filing_status: "mfs",
    spouse_first_name: "Other",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "222334444",
    mfs_spouse_itemizing: false,
    mfs_spouse_lived_with_taxpayer: true,
  });
  const source = pdfReviewFixtures.find((f) =>
    f.id ===
      (basis === "last_six_months_apart"
        ? "mfs-w2-separated-spouse-eic"
        : "mfs-w2-legal-separation-eic-child")
  )!;
  general.mfs_eitc_separation_review = structuredClone(
    (source.inputs.general as Record<string, unknown>)
      .mfs_eitc_separation_review,
  );
  const child = (general.dependents as Array<Record<string, unknown>>)[0];
  child.ssn_issued_before_due_date = true;
  if (claimed) {
    delete child.dependent_on_another_return;
    delete child.custodial_eitc_release_review;
    inputs.f8812 = structuredClone(
      pdfReviewFixtures.find((f) =>
        f.id === "mfs-w2-legal-separation-eic-child"
      )!.inputs.f8812,
    );
  }
  (inputs.w2 as Array<Record<string, unknown>>)[0].employee_ssn = "111223333";
  return inputs;
}
