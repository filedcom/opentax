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
import { jointDistributionReviewSchema } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/calculation.ts";
import { FilingStatus, TS } from "../../../../../nodes/types.ts";

function assertOwnerSaverDistributionCopies(
  ledgerEntries: z.infer<typeof nonjointDistributionReviewSchema>["entries"],
  copies: readonly z.infer<typeof itemSchema>[],
  subject: TS,
): void {
  assertDistinct1099RCopies(copies);
  const entries = ledgerEntries.filter((entry) => entry.current_year_1099r);
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
      matches.length !== 1 || !copy || (copy.ts ?? TS.T) !== subject ||
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

export function assertNonjointSaverDistributionCopies(
  review: z.infer<typeof nonjointDistributionReviewSchema>,
  copies: readonly z.infer<typeof itemSchema>[],
): void {
  assertOwnerSaverDistributionCopies(review.entries, copies, TS.T);
}

export function assertJointSaverDistributionCopies(
  review: z.infer<typeof jointDistributionReviewSchema>,
  copies: readonly z.infer<typeof itemSchema>[],
  taxpayerSsn: string | undefined,
  spouseSsn: string | undefined,
): void {
  if (!review.current_year_source_inventory_review) return;
  const primary = taxpayerSsn?.replaceAll("-", "");
  const spouse = spouseSsn?.replaceAll("-", "");
  if (
    !primary || !spouse || !/^\d{9}$/.test(primary) ||
    !/^\d{9}$/.test(spouse) || primary === spouse
  ) {
    throw new Error(
      "Form 8880 reviewed joint inventory needs distinct taxpayer and spouse identities",
    );
  }
  assertDistinct1099RCopies(copies);
  for (const [subject, owner] of [[TS.T, primary], [TS.S, spouse]] as const) {
    const entries = review.entries.filter((entry) =>
      entry.recipient === subject && entry.current_year_1099r
    ).map((entry) => ({
      recipient_ssn: owner,
      received_date: entry.received_date,
      gross_amount: entry.gross_amount!,
      source_document_ref: entry.source_document_ref,
      classification_review_ref:
        entry.current_year_1099r!.plan_classification_review_ref,
      treatment: entry.treatment!,
      current_year_1099r: entry.current_year_1099r,
    }));
    assertOwnerSaverDistributionCopies(
      entries,
      copies.filter((copy) => (copy.ts ?? TS.T) === subject),
      subject,
    );
  }
}

const generalReviewSchema = z.object({
  form8880_nonjoint_distribution_review: nonjointDistributionReviewSchema
    .optional(),
  form8880_joint_distribution_review: jointDistributionReviewSchema.optional(),
});

export function assertPublicSaverDistributionSources(
  rawGeneral: unknown,
  raw1099R: unknown,
): void {
  const general = generalReviewSchema.parse(rawGeneral ?? {});
  const review = general.form8880_nonjoint_distribution_review;
  const joint = general.form8880_joint_distribution_review;
  if (!review && !joint?.current_year_source_inventory_review) return;
  const copies = z.array(itemSchema).parse(raw1099R ?? []);
  if (review) assertNonjointSaverDistributionCopies(review, copies);
  if (joint?.current_year_source_inventory_review) {
    const owners = z.object({
      taxpayer_ssn: z.string().optional(),
      spouse_ssn: z.string().optional(),
      filing_status: z.nativeEnum(FilingStatus),
    }).parse(rawGeneral);
    if (owners.filing_status !== FilingStatus.MFJ) {
      throw new Error(
        "Form 8880 joint source inventory requires a joint return",
      );
    }
    assertJointSaverDistributionCopies(
      joint,
      copies,
      owners.taxpayer_ssn,
      owners.spouse_ssn,
    );
  }
}
