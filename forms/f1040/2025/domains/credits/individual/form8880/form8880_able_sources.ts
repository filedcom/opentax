import { z } from "zod";
import { ableContributionReviewSchema } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/able_contribution_review.ts";
import { employeeContributionReviewSchema } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/employee_contribution_review.ts";
import {
  assertDistinctW2IssuedCopies,
  Box12Code,
  w2ItemSchema,
} from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { ownedLine1Contributions } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/calculation.ts";

export function assertAbleEmploymentW2Sources(
  review: z.infer<typeof ableContributionReviewSchema>,
  copies: readonly z.infer<typeof w2ItemSchema>[],
  employeeReview: z.infer<typeof employeeContributionReviewSchema> | undefined,
): void {
  if (!review.accounts.some((a) => a.employed_beneficiary_review)) return;
  assertDistinctW2IssuedCopies(copies);
  // Section529A(b)(7): 401(a)/403(a) defined-contribution, 403(b), and 457(b).
  // IRA-based SARSEP/SIMPLE codes F/S alone do not establish those contributions.
  const disqualifyingCodes = new Set<Box12Code>([
    Box12Code.D,
    Box12Code.E,
    Box12Code.G,
    Box12Code.AA,
    Box12Code.BB,
    Box12Code.EE,
  ]);
  for (const account of review.accounts) {
    const employment = account.employed_beneficiary_review;
    if (!employment) continue;
    const owner = account.form5498qa.beneficiary_ssn;
    const owned = copies.filter((w) =>
      w.employee_ssn?.replaceAll("-", "") === owner
    );
    if (
      owned.length !== employment.wages.length ||
      employeeReview?.entries.some((e) => e.payroll.employee_ssn === owner)
    ) {
      throw new Error(
        "ABLE employment limit conflicts with the complete owned wage or retirement-plan inventory",
      );
    }
    for (const wage of employment.wages) {
      const matches = owned.filter((w) =>
        w.employee_ssn?.replaceAll("-", "") === owner &&
        w.employer_ein?.replaceAll("-", "") === wage.employer_ein
      );
      const copy = matches[0];
      if (
        matches.length !== 1 || !copy || copy.box1_wages !== wage.box1_wages ||
        (copy.box11_nonqual_plans ?? 0) > 0 ||
        copy.box13_statutory_employee === true ||
        copy.box12_entries?.some((e) =>
          e.amount > 0 && disqualifyingCodes.has(e.code)
        )
      ) {
        throw new Error(
          "ABLE employment limit needs reconciled current-service W-2 wages without disqualifying plan contributions",
        );
      }
    }
  }
}

export function assertPublicAbleContributionSources(
  rawGeneral: unknown,
  rawW2: unknown,
): void {
  const general = generalSchema.pick({
    form8880_able_contribution_review: true,
    form8880_employee_contribution_review: true,
    form8880_nonjoint_distribution_review: true,
    form8880_joint_distribution_review: true,
    taxpayer_ssn: true,
    spouse_ssn: true,
    filing_status: true,
  }).partial().parse(rawGeneral ?? {});
  if (general.form8880_able_contribution_review) {
    assertAbleEmploymentW2Sources(
      general.form8880_able_contribution_review,
      z.array(w2ItemSchema).parse(rawW2 ?? []),
      general.form8880_employee_contribution_review,
    );
  }
  ownedLine1Contributions({
    able_contribution_review: general.form8880_able_contribution_review,
    nonjoint_distribution_review: general.form8880_nonjoint_distribution_review,
    joint_distribution_review: general.form8880_joint_distribution_review,
    taxpayer_ssn: general.taxpayer_ssn,
    spouse_ssn: general.spouse_ssn,
    filing_status: general.filing_status,
  });
}
