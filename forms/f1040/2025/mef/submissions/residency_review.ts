import { z } from "zod";
import { FilingStatus } from "../../../mef/header.ts";

const personReviewSchema = z.object({
  tin: z.string().regex(/^\d{9}$/),
  tax_status: z.enum([
    "full_year_us_citizen",
    "full_year_resident_alien",
    "full_year_resident_by_joint_election",
    "dual_status",
    "nonresident",
  ]),
  status_source_reference: z.string().trim().min(1),
  reviewer_reference: z.string().trim().min(1),
  reviewed_on: z.string().date(),
  signed_joint_election_reference: z.string().trim().min(1).optional(),
}).strict();

export const filingResidencyReviewSchema = z.object({
  tax_year: z.literal(2025),
  taxpayer: personReviewSchema,
  spouse: personReviewSchema.optional(),
}).strict();

export type FilingResidencyReview = z.infer<
  typeof filingResidencyReviewSchema
>;

/** Require a reviewed full-year Form 1040 filing classification at A2A delivery. */
export function assertFilingResidencyReview(
  value: unknown,
  primaryTin: string,
  spouseTin: string | undefined,
  filingStatus: unknown,
  processingDate: Date,
  residentElectionOnReturn: boolean,
): FilingResidencyReview {
  const review = filingResidencyReviewSchema.parse(value);
  const joint = filingStatus === FilingStatus.MarriedFilingJointly;
  if (
    review.taxpayer.tin !== primaryTin ||
    (joint
      ? !spouseTin || review.spouse?.tin !== spouseTin
      : review.spouse !== undefined)
  ) {
    throw new Error(
      "MeF submission residency review must identify every joint filer and the final return",
    );
  }
  const people = [
    review.taxpayer,
    ...(review.spouse ? [review.spouse] : []),
  ];
  if (
    Number.isNaN(processingDate.getTime()) ||
    people.some((person) =>
        person.tax_status === "full_year_resident_by_joint_election"
      ) !== residentElectionOnReturn
  ) {
    throw new Error(
      "MeF submission residency election review must match the finalized Form 1040 election",
    );
  }
  for (const person of people) {
    const elected = person.tax_status ===
      "full_year_resident_by_joint_election";
    if (
      person.tax_status === "dual_status" ||
      person.tax_status === "nonresident" ||
      elected && (!joint || !person.signed_joint_election_reference) ||
      !elected && person.signed_joint_election_reference !== undefined ||
      person.reviewed_on < "2025-12-31" ||
      person.reviewed_on > processingDate.toISOString().slice(0, 10)
    ) {
      throw new Error(
        "TY2025 dual-status or nonresident filer cannot enter the Form 1040 A2A submission; reviewed full-year status is required",
      );
    }
  }
  return review;
}
