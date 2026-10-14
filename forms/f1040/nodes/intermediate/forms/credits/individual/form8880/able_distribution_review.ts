import { z } from "zod";

export enum AbleExpenseCategory {
  Education = "education",
  Housing = "housing",
  Transportation = "transportation",
  Employment = "employment_training_and_support",
  Technology = "assistive_technology",
  PersonalSupport = "personal_support",
  Health = "health_prevention_and_wellness",
  Financial = "financial_management_and_administration",
  Legal = "legal_fees",
  Oversight = "oversight_and_monitoring",
}

const reference = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const money = z.number().finite().nonnegative().multipleOf(0.01);
const currentDate = z.string().date().refine((date) =>
  date.startsWith("2025-")
);

/** Ordinary living-beneficiary distributions, not rollovers, excess returns or death payments. */
export const ableDistributionReviewSchema = z.object({
  qualification_review_ref: reference,
  complete_distribution_and_expense_inventory_confirmed: z.literal(true),
  no_rollovers_transfers_or_beneficiary_changes_confirmed: z.literal(true),
  no_returned_excess_or_additional_accounts_confirmed: z.literal(true),
  beneficiary_alive_through_all_distributions_confirmed: z.literal(true),
  form1099qa: z.object({
    source_document_ref: reference,
    recipient_ssn: tin,
    program_ein: tin,
    account_number: reference,
    box1_gross_distribution: money.positive(),
    box2_earnings: money,
    box3_basis: money,
    box4_program_transfer: z.literal(false),
    box5_account_terminated: z.literal(false),
    box6_other_recipient: z.literal(false),
  }).strict(),
  distributions: z.array(
    z.object({
      source_document_ref: reference,
      received_on: currentDate,
      amount: money.positive(),
    }).strict(),
  ).min(1),
  qualified_expenses: z.array(
    z.object({
      source_document_ref: reference,
      beneficiary_ssn: tin,
      category: z.nativeEnum(AbleExpenseCategory),
      paid_on: z.string().date(),
      amount: money.positive(),
      relates_to_beneficiary_disability_confirmed: z.literal(true),
      not_used_for_other_tax_benefits_confirmed: z.literal(true),
      not_allocated_to_another_tax_year_confirmed: z.literal(true),
      // 26 CFR 1.529A-3(a)(2): election for expenses paid in the next 60 days.
      next_year_60_day_election_ref: reference.optional(),
    }).strict(),
  ),
}).strict().superRefine((review, context) => {
  const source = review.form1099qa;
  const cents = (n: number) => Math.round(n * 100);
  const refs = ableDistributionReferences(review);
  if (
    cents(source.box2_earnings) + cents(source.box3_basis) !==
      cents(source.box1_gross_distribution) ||
    review.distributions.reduce((sum, d) => sum + cents(d.amount), 0) !==
      cents(source.box1_gross_distribution) ||
    new Set(refs).size !== refs.length
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "ABLE distributions need distinct records reconciling gross, earnings, basis and dated payments",
    });
  }
  for (const [index, expense] of review.qualified_expenses.entries()) {
    const nextYear = expense.paid_on >= "2026-01-01" &&
      expense.paid_on <= "2026-03-01";
    if (
      expense.beneficiary_ssn !== source.recipient_ssn ||
      !(expense.paid_on.startsWith("2025-") || nextYear) ||
      nextYear !== (expense.next_year_60_day_election_ref !== undefined)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["qualified_expenses", index],
        message:
          "ABLE expenses need the beneficiary, an eligible payment date and any next-year election",
      });
    }
  }
});

// Structural input avoids a circular inference through the schema refinement.
const referenceFieldsSchema = z.object({
  qualification_review_ref: reference,
  form1099qa: z.object({ source_document_ref: reference }),
  distributions: z.array(z.object({ source_document_ref: reference })),
  qualified_expenses: z.array(z.object({
    source_document_ref: reference,
    next_year_60_day_election_ref: reference.optional(),
  })),
});

export function ableDistributionReferences(
  review: z.infer<typeof referenceFieldsSchema>,
): string[] {
  return [
    review.qualification_review_ref,
    review.form1099qa.source_document_ref,
    ...review.distributions.map((d) => d.source_document_ref),
    ...review.qualified_expenses.flatMap((e) => [
      e.source_document_ref,
      ...(e.next_year_60_day_election_ref
        ? [e.next_year_60_day_election_ref]
        : []),
    ]),
  ];
}

/** Annual earnings ratio under 26 CFR 1.529A-3(a), then whole-dollar filing. */
export function ableDistributionAmounts(
  raw: z.infer<typeof ableDistributionReviewSchema>,
) {
  const review = ableDistributionReviewSchema.parse(raw);
  const grossCents = Math.round(
    review.form1099qa.box1_gross_distribution * 100,
  );
  const earningsCents = Math.round(review.form1099qa.box2_earnings * 100);
  const expenseCents = review.qualified_expenses.reduce(
    (sum, e) => sum + Math.round(e.amount * 100),
    0,
  );
  const taxableEarnings = earningsCents *
    Math.max(0, grossCents - expenseCents) /
    grossCents / 100;
  const taxableWholeDollars = Math.round(taxableEarnings);
  return {
    grossDistribution: grossCents / 100,
    qualifiedExpenses: expenseCents / 100,
    taxableEarnings,
    taxableWholeDollars,
    additionalTax: Math.round(taxableWholeDollars * 0.1),
    lastDistributionDate: review.distributions.map((d) => d.received_on).sort()
      .at(-1)!,
  };
}
