import { z } from "zod";
import { FilingStatus } from "../../../../../types.ts";

export enum AbleEligibilityBasis {
  SSDI = "A",
  SSI = "B",
  DisabilityCertification = "C",
}
const reference = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const money = z.number().finite().nonnegative().multipleOf(0.01);

/** Ordinary-limit ABLE contributions; issuer facts and beneficiary payments. */
export const ableContributionReviewSchema = z.object({
  tax_year: z.literal(2025),
  reviewed_by: reference,
  reviewed_on: z.string().date(),
  complete_able_account_inventory_confirmed: z.literal(true),
  accounts: z.array(
    z.object({
      form5498qa: z.object({
        source_document_ref: reference,
        beneficiary_ssn: tin,
        program_ein: tin,
        account_number: reference,
        box1_contributions: money.max(19000),
        box2_able_rollovers: money,
        box6_eligibility_basis: z.nativeEnum(AbleEligibilityBasis),
      }).strict(),
      program_review_ref: reference,
      eligible_individual_in_2025_confirmed: z.literal(true),
      no_current_year_able_distributions_confirmed: z.literal(true),
      no_returned_or_excess_contributions_confirmed: z.literal(true),
      no_prior_year_excess_contributions_confirmed: z.literal(true),
      within_program_cumulative_limit_confirmed: z.literal(true),
      contribution_detail_ref: reference,
      other_contributors_cash: money,
      qtp_rollovers_or_transfers: money,
      beneficiary_payments: z.array(
        z.object({
          source_document_ref: reference,
          paid_on: z.string().date().refine((d) => d.startsWith("2025-")),
          contributor_ssn: tin,
          amount: money.positive(),
        }).strict(),
      ),
    }).strict(),
  ).min(1),
}).strict().superRefine((review, context) => {
  const refs = new Set<string>();
  const beneficiaries = new Set<string>();
  for (const [index, account] of review.accounts.entries()) {
    const source = account.form5498qa;
    const payments = account.beneficiary_payments;
    const ownCents = payments.reduce(
      (sum, p) => sum + Math.round(p.amount * 100),
      0,
    );
    const allRefs = [
      source.source_document_ref,
      account.program_review_ref,
      account.contribution_detail_ref,
      ...payments.map((p) => p.source_document_ref),
    ];
    const invalid = beneficiaries.has(source.beneficiary_ssn) ||
      payments.some((p) => p.contributor_ssn !== source.beneficiary_ssn) ||
      ownCents + Math.round(account.other_contributors_cash * 100) +
            Math.round(account.qtp_rollovers_or_transfers * 100) !==
        Math.round(source.box1_contributions * 100) ||
      new Set(allRefs).size !== allRefs.length || allRefs.some((ref) =>
        refs.has(ref)
      );
    if (invalid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accounts", index],
        message:
          "Form 8880 ABLE contributions need distinct reconciled beneficiary payments and program records",
      });
    }
    beneficiaries.add(source.beneficiary_ssn);
    allRefs.forEach((ref) => refs.add(ref));
  }
});

export function ownedAbleContributions(
  review: z.infer<typeof ableContributionReviewSchema> | undefined,
  taxpayerSsn: string | undefined,
  spouseSsn: string | undefined,
  status: FilingStatus | undefined,
): { taxpayer: number; spouse: number } {
  if (!review) return { taxpayer: 0, spouse: 0 };
  const parsed = ableContributionReviewSchema.parse(review);
  const primary = taxpayerSsn?.replaceAll("-", "");
  const spouse = spouseSsn?.replaceAll("-", "");
  if (!primary || !/^\d{9}$/.test(primary) || primary === spouse) {
    throw new Error(
      "Form 8880 ABLE review needs distinct sourced filer identities",
    );
  }
  return parsed.accounts.reduce((totals, account) => {
    const owner = account.form5498qa.beneficiary_ssn;
    if (
      owner !== primary &&
      (status !== FilingStatus.MFJ || !spouse || owner !== spouse)
    ) {
      throw new Error(
        "Form 8880 ABLE beneficiary is not this taxpayer or joint spouse",
      );
    }
    const amount = account.beneficiary_payments.reduce((sum, p) =>
      sum + Math.round(p.amount * 100), 0) / 100;
    return {
      taxpayer: totals.taxpayer + (owner === primary ? amount : 0),
      spouse: totals.spouse + (owner === spouse ? amount : 0),
    };
  }, { taxpayer: 0, spouse: 0 });
}
