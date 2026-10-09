import { z } from "zod";
import {
  nonjointDistributionReviewSchema,
  SaverDistributionTreatment,
} from "../../../../../nodes/intermediate/forms/credits/individual/form8880/nonjoint_distribution_review.ts";
import {
  assertDistinct1099RCopies,
  DistributionCode,
  itemSchema,
} from "../../../../../nodes/inputs/income/retirement/f1099r/index.ts";
import { TS } from "../../../../../nodes/types.ts";

export function assertNonjointSaverDistributionCopies(
  review: z.infer<typeof nonjointDistributionReviewSchema>,
  copies: readonly z.infer<typeof itemSchema>[],
): void {
  assertDistinct1099RCopies(copies);
  const entries = review.entries.filter((entry) => entry.current_year_1099r);
  const positive = copies.filter((copy) => copy.box1_gross_distribution > 0);
  if (entries.length !== positive.length) {
    throw new Error(
      "Form 8880 current-year ledger differs from the complete Form 1099-R inventory",
    );
  }
  for (const entry of entries) {
    const claim = entry.current_year_1099r!;
    const matches = positive.filter((copy) =>
      copy.source_document_reference === entry.source_document_ref
    );
    const copy = matches[0];
    if (
      copy &&
      [copy.box7_distribution_code, copy.box7_code2].includes(
        DistributionCode.CodeD,
      ) &&
      entry.treatment !== SaverDistributionTreatment.NonqualifyingPlan
    ) {
      throw new Error(
        "Form 8880 code D source needs nonqualifying-plan classification",
      );
    }
    if (
      matches.length !== 1 || !copy || copy.ts === TS.S ||
      copy.recipient_ssn?.replaceAll("-", "") !==
        entry.recipient_ssn.replaceAll("-", "") ||
      copy.payer_ein.replaceAll("-", "") !==
        claim.payer_ein.replaceAll("-", "") ||
      copy.account_number !== claim.account_number ||
      copy.box1_gross_distribution !== entry.gross_amount ||
      copy.box2a_taxable_amount !== claim.taxable_amount ||
      copy.box2b_not_determined === true ||
      copy.box7_distribution_code !== claim.distribution_code ||
      copy.box7_code2 !== claim.second_distribution_code ||
      (copy.box7_ira_simple_indicator ?? false) !== claim.ira_simple_indicator
    ) {
      throw new Error(
        "Form 8880 current-year distribution differs from its reviewed Form 1099-R copy",
      );
    }
  }
}

const generalReviewSchema = z.object({
  form8880_nonjoint_distribution_review: nonjointDistributionReviewSchema
    .optional(),
});

export function assertPublicNonjointSaverDistributionSources(
  rawGeneral: unknown,
  raw1099R: unknown,
): void {
  const general = generalReviewSchema.parse(rawGeneral ?? {});
  const review = general.form8880_nonjoint_distribution_review;
  if (!review) return;
  assertNonjointSaverDistributionCopies(
    review,
    z.array(itemSchema).parse(raw1099R ?? []),
  );
}
