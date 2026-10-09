import { jointDistributionReviewSchema } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/calculation.ts";
import { nonjointDistributionReviewSchema } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/nonjoint_distribution_review.ts";
import { z } from "zod";
import {
  employeeContributionReviewSchema,
  ownedEmployeeContributions,
} from "../../../../../nodes/intermediate/forms/credits/individual/form8880/employee_contribution_review.ts";
import {
  assertDistinctW2IssuedCopies,
  w2ItemSchema as w2Schema,
} from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";

export function assertEmployeeContributionW2Sources(
  review: z.infer<typeof employeeContributionReviewSchema>,
  copies: readonly z.infer<typeof w2Schema>[],
  taxpayerSsn: string | undefined,
  spouseSsn: string | undefined,
  status: FilingStatus | undefined,
): void {
  ownedEmployeeContributions(review, taxpayerSsn, spouseSsn, status);
  assertDistinctW2IssuedCopies(copies);
  for (const { payroll } of review.entries) {
    const matches = copies.filter((copy) =>
      copy.employee_ssn?.replaceAll("-", "") === payroll.employee_ssn &&
      copy.employer_ein?.replaceAll("-", "") === payroll.employer_ein
    );
    if (matches.length !== 1) {
      throw new Error(
        "Form 8880 voluntary payroll source needs one matching owned employer W-2",
      );
    }
  }
}

const generalSchema = z.object({
  form8880_joint_distribution_review: jointDistributionReviewSchema.optional(),
  form8880_nonjoint_distribution_review: nonjointDistributionReviewSchema
    .optional(),
  form8880_employee_contribution_review: employeeContributionReviewSchema
    .optional(),
  taxpayer_ssn: z.string().optional(),
  spouse_ssn: z.string().optional(),
  filing_status: z.nativeEnum(FilingStatus).optional(),
});

export function assertPublicEmployeeContributionSources(
  rawGeneral: unknown,
  rawW2: unknown,
): void {
  const general = generalSchema.parse(rawGeneral ?? {});
  if (!general.form8880_employee_contribution_review) return;
  if (
    general.filing_status === FilingStatus.MFJ
      ? !general.form8880_joint_distribution_review
        ?.current_year_source_inventory_review
      : !general.form8880_nonjoint_distribution_review
  ) {
    throw new Error(
      "Form 8880 voluntary contributions need a complete reviewed distribution inventory",
    );
  }

  assertEmployeeContributionW2Sources(
    general.form8880_employee_contribution_review,
    z.array(w2Schema).parse(rawW2 ?? []),
    general.taxpayer_ssn,
    general.spouse_ssn,
    general.filing_status,
  );
}
