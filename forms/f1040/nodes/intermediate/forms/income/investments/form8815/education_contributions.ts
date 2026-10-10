import { z } from "zod";
import type { Form8815Input } from "./index.ts";

export enum EducationAccountKind {
  Coverdell = "coverdell_esa",
  Qtp = "qualified_tuition_program",
}

const reference = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const amount = z.number().int().nonnegative().safe();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}, "Form 8815 contribution needs a real calendar date");

export const contributionAccountSchema = z.object({
  kind: z.nativeEnum(EducationAccountKind),
  account_reference: reference,
  beneficiary_tin: tin,
  qualification_record_reference: reference,
}).strict();

const commonEducationFacts = {
  all_students_are_taxpayer_spouse_or_claimed_dependents: z.literal(true),
  expenses_not_used_for_education_credit_or_tax_free_distribution: z.literal(
    true,
  ),
  nontaxable_benefits_paid_directly_by_institution_excluded: z.literal(true),
};

export const educationFactsSchema = z.discriminatedUnion(
  "no_coverdell_or_qtp_contributions_in_claim",
  [
    z.object({
      ...commonEducationFacts,
      no_coverdell_or_qtp_contributions_in_claim: z.literal(true),
      all_institutions_eligible: z.literal(true),
      expenses_are_eligible_2025_tuition_or_fees: z.literal(true),
    }).strict(),
    z.object({
      ...commonEducationFacts,
      no_coverdell_or_qtp_contributions_in_claim: z.literal(false),
      tuition_institutions_eligible: z.literal(true),
      contribution_accounts_qualified: z.literal(true),
      expenses_are_eligible_2025_tuition_fees_or_contributions: z.literal(true),
    }).strict(),
  ],
);

export const contributionReviewSchema = z.object({
  tuition_and_fees_amount: amount,
  payments: z.array(
    z.object({
      line1_entry_number: z.number().int().positive().safe(),
      payment_reference: reference,
      source_document_reference: reference,
      contributor_tin: tin,
      paid_date: date.refine(
        (value) => value.startsWith("2025-"),
        "Form 8815 needs 2025 payments",
      ),
      amount: amount.positive(),
      cash_contribution_not_rollover_or_transfer: z.literal(true),
      not_returned_or_used_for_another_tax_benefit: z.literal(true),
    }).strict(),
  ).min(1),
  coverdell_beneficiaries: z.array(
    z.object({
      beneficiary_tin: tin,
      beneficiary_dob: date,
      special_needs_record_reference: reference.optional(),
      other_2025_contributions_all_sources: amount,
      other_2025_contributions_by_filers: amount,
      annual_contribution_inventory_reference: reference,
      no_prior_excess_remaining: z.literal(true),
    }).strict(),
  ),
}).strict();

type ContributionReview = z.infer<typeof contributionReviewSchema>;

function contributionAccounts(input: Form8815Input) {
  return input.eligible_students.flatMap((student, index) =>
    student.contribution_account
      ? [{ index, account: student.contribution_account }]
      : []
  );
}
type Accounts = ReturnType<typeof contributionAccounts>;

function assertPaymentAccounts(
  input: Form8815Input,
  review: ContributionReview,
  accounts: Accounts,
): void {
  const references = review.payments.map((payment) =>
    payment.payment_reference
  );
  if (new Set(references).size !== references.length) {
    throw new Error("Form 8815 repeats a contribution payment");
  }
  const accountReferences = accounts.map(({ account }) =>
    account.account_reference
  );
  if (new Set(accountReferences).size !== accountReferences.length) {
    throw new Error("Form 8815 repeats a contribution account");
  }
  if (
    review.payments.some((payment) =>
      !input.eligible_students[payment.line1_entry_number - 1]
        ?.contribution_account
    ) ||
    accounts.some(({ index }) =>
      !review.payments.some((payment) =>
        payment.line1_entry_number === index + 1
      )
    )
  ) {
    throw new Error(
      "Form 8815 contribution payment must match a listed account",
    );
  }
}

function assertTuitionTotal(
  input: Form8815Input,
  review: ContributionReview,
  accountCount: number,
): void {
  if (
    review.tuition_and_fees_amount > 0 &&
    accountCount === input.eligible_students.length
  ) {
    throw new Error(
      "Form 8815 tuition needs a separate listed educational institution",
    );
  }
  const total = review.payments.reduce(
    (sum, payment) => sum + payment.amount,
    review.tuition_and_fees_amount,
  );
  if (
    !Number.isSafeInteger(total) ||
    total !== input.line2_qualified_education_expenses
  ) {
    throw new Error("Form 8815 contributions and tuition differ from line 2");
  }
}

function assertCoverdellInventories(
  input: Form8815Input,
  review: ContributionReview,
  accounts: Accounts,
): void {
  const beneficiaries = accounts.filter(({ account }) =>
    account.kind === EducationAccountKind.Coverdell
  )
    .map(({ account }) => account.beneficiary_tin);
  const inventories = review.coverdell_beneficiaries.map((row) =>
    row.beneficiary_tin
  );
  if (
    new Set(inventories).size !== inventories.length ||
    new Set(beneficiaries).size !== inventories.length ||
    inventories.some((beneficiary) => !beneficiaries.includes(beneficiary))
  ) {
    throw new Error(
      "Form 8815 needs one annual inventory per Coverdell beneficiary",
    );
  }
  for (const inventory of review.coverdell_beneficiaries) {
    const payments = review.payments.filter((payment) => {
      const account = input.eligible_students[payment.line1_entry_number - 1]
        .contribution_account;
      return account?.kind === EducationAccountKind.Coverdell &&
        account.beneficiary_tin === inventory.beneficiary_tin;
    });
    const total = payments.reduce(
      (sum, payment) => sum + payment.amount,
      inventory.other_2025_contributions_all_sources,
    );
    const eighteenthBirthday = `${
      Number(inventory.beneficiary_dob.slice(0, 4)) + 18
    }${inventory.beneficiary_dob.slice(4)}`;
    if (
      total > 2000 ||
      inventory.other_2025_contributions_by_filers >
        inventory.other_2025_contributions_all_sources ||
      payments.some((payment) =>
        payment.paid_date < inventory.beneficiary_dob ||
        (!inventory.special_needs_record_reference &&
          payment.paid_date >= eighteenthBirthday)
      )
    ) {
      throw new Error(
        "Form 8815 Coverdell age or annual contribution limit is not satisfied",
      );
    }
  }
}

/** Reconcile all contributions before calculating the exclusion. */
export function assertEducationContributions(input: Form8815Input): void {
  const accounts = contributionAccounts(input);
  const review = input.education_contributions;
  if (input.education_facts.no_coverdell_or_qtp_contributions_in_claim) {
    if (review || accounts.length) {
      throw new Error(
        "Form 8815 tuition-only facts conflict with contribution accounts",
      );
    }
    return;
  }
  if (!review || accounts.length === 0) {
    throw new Error("Form 8815 contributions need account and payment records");
  }
  assertPaymentAccounts(input, review, accounts);
  assertTuitionTotal(input, review, accounts.length);
  assertCoverdellInventories(input, review, accounts);
}
