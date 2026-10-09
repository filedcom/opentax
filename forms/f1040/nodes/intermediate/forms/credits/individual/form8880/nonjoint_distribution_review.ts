import { DistributionCode } from "../../../../../inputs/income/retirement/f1099r/distribution-code.ts";
import { z } from "zod";

export enum SaverDistributionTreatment {
  Included = "included",
  NonqualifyingPlan = "not_a_form8880_retirement_plan",
  RolloverOrTransfer = "nontaxable_rollover_or_transfer",
  InPlanRothRollover = "in_plan_roth_rollover",
  RothConversion = "eligible_plan_to_roth_ira",
  DeemedLoan = "deemed_plan_loan",
  ExcessReturn = "returned_excess_contribution_or_deferral",
  TimelyIraReturn = "timely_returned_current_year_ira_contribution",
  EsopDividend = "section404k_esop_dividend",
  Military = "military_retirement_other_than_tsp",
  InheritedIra = "nonspousal_inherited_ira",
}

const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^(?:\d{9}|\d{3}-\d{2}-\d{4})$/);

export const reviewedSaver1099RCopySchema = z.object({
  payer_ein: z.string().regex(/^(?:\d{9}|\d{2}-\d{7})$/),
  account_number: reference,
  taxable_amount: z.number().finite().nonnegative(),
  distribution_code: z.nativeEnum(DistributionCode),
  second_distribution_code: z.nativeEnum(DistributionCode).optional(),
  ira_simple_indicator: z.boolean(),
  plan_classification_review_ref: reference,
}).strict();

/** Reviewed line-4 classification, not authentication of payer records. */
export const nonjointDistributionReviewSchema = z.object({
  taxpayer_ssn: ssn,
  reviewed_by: reference,
  reviewed_on: z.string().date(),
  filing_due_date: z.enum(["2026-04-15", "2026-10-15"]),
  extension_confirmation_ref: reference.optional(),
  reviewed_distribution_sources_ref: reference,
  complete_distribution_inventory_confirmed: z.literal(true),
  entries: z.array(
    z.object({
      recipient_ssn: ssn,
      received_date: z.string().date(),
      gross_amount: z.number().finite().positive(),
      source_document_ref: reference,
      classification_review_ref: reference,
      treatment: z.nativeEnum(SaverDistributionTreatment),
      current_year_1099r: reviewedSaver1099RCopySchema.optional(),
    }).strict(),
  ),
}).strict().superRefine((review, context) => {
  if (
    (review.filing_due_date === "2026-10-15") !==
      (review.extension_confirmation_ref !== undefined)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 8880 extended due date needs its extension confirmation",
    });
  }
  const refs = review.entries.map((entry) => entry.source_document_ref);
  if (new Set(refs).size !== refs.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 8880 nonjoint distribution references must be distinct",
    });
  }
  for (const [index, entry] of review.entries.entries()) {
    if (
      (entry.received_date.startsWith("2025-")) !==
        (entry.current_year_1099r !== undefined)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries", index, "current_year_1099r"],
        message:
          "Form 8880 current-year ledger supports reviewed Form 1099-R sources only",
      });
    }
    if (
      entry.recipient_ssn.replaceAll("-", "") !==
        review.taxpayer_ssn.replaceAll("-", "") ||
      entry.received_date < "2023-01-01" ||
      entry.received_date >= review.filing_due_date
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries", index],
        message:
          "Form 8880 distributions need the taxpayer and an in-window date",
      });
    }
  }
});

export function nonjointDistributionTotal(
  review: z.infer<typeof nonjointDistributionReviewSchema>,
): number {
  return review.entries.reduce(
    (total, entry) =>
      total +
      (entry.treatment === SaverDistributionTreatment.Included
        ? entry.gross_amount
        : 0),
    0,
  );
}
