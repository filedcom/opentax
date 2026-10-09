import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { ownedLine1Contributions } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/calculation.ts";

export function assertPublicAbleContributionSources(rawGeneral: unknown): void {
  const general = generalSchema.pick({
    form8880_able_contribution_review: true,
    form8880_nonjoint_distribution_review: true,
    form8880_joint_distribution_review: true,
    taxpayer_ssn: true,
    spouse_ssn: true,
    filing_status: true,
  }).partial().parse(rawGeneral ?? {});
  if (!general.form8880_able_contribution_review) return;
  ownedLine1Contributions({
    able_contribution_review: general.form8880_able_contribution_review,
    nonjoint_distribution_review: general.form8880_nonjoint_distribution_review,
    joint_distribution_review: general.form8880_joint_distribution_review,
    taxpayer_ssn: general.taxpayer_ssn,
    spouse_ssn: general.spouse_ssn,
    filing_status: general.filing_status,
  });
}
