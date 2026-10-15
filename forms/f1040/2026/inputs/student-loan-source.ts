import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import {
  inputSchema as sharedCopiesSchema,
  itemSchema as sharedCopySchema,
} from "../../nodes/inputs/adjustments/education/f1098e/index.ts";
import { cappedStudentLoanInterest } from "../../nodes/inputs/adjustments/education/f1098e/amounts.ts";

const reference = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const ein = z.string().regex(/^\d{2}-?\d{7}$/);
const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 1000,
).refine(
  (n) => Math.abs(n * 100 - Math.round(n * 100)) < .00001,
  "Student-loan records need amounts in dollars and cents",
);
const date = z.string().date().refine(
  (s) => new Date(s).toISOString().slice(0, 10) === s,
  "Invalid calendar date",
);
const digits = (s: string) => s.replaceAll("-", "");
const cents = (n: number) => Math.round(n * 100);
const key = (s: string) => s.trim().toUpperCase();
export const studentLoanCopy2026Schema = sharedCopySchema.extend({
  tax_year: z.literal(2026),
  lender_name: reference,
  lender_tin: ein,
  borrower_tin: sharedCopySchema.shape.borrower_tin.unwrap(),
  source_document_reference: reference,
  box1_student_loan_interest: money,
  box2_origination_fees_excluded: z.boolean(),
}).strict();
const paymentSchema = z.object({
  allocation_reference: reference,
  payment_record_reference: reference,
  paid_on: date.refine((s) => s.startsWith("2026-"), "Payment must be in 2026"),
  amount_paid: money,
  stated_interest_paid: money,
  // Reviewed reasonable amortization schedule; accrual is not itself a payment.
  origination_fee_accrued: money,
  capitalized_interest_added: money,
  funding: z.enum([
    "borrower_or_joint_funds",
    "third_party_gift",
    "taxable_employer_payment",
    "tax_free_employer_assistance",
    "529_distribution",
    "other_tax_free_repayment_assistance",
  ]),
  funding_review_reference: reference,
  qtp_tax_free_earnings_used_for_interest: money.optional(),
  interest_deducted_elsewhere: money,
}).strict();
const reportingSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("1098e"),
    statement_reference: reference,
    box1_allocated_to_loan: money,
    origination_fees_in_box1: money,
    capitalized_interest_in_box1: money,
    allocation_record_reference: reference,
  }).strict(),
  z.object({
    kind: z.literal("no_form"),
    reason: z.enum(["below_reporting_threshold", "lender_did_not_issue"]),
    lender_statement_review_reference: reference,
  }).strict(),
]);
export const studentLoan2026Schema = z.object({
  loan_id: reference,
  lender_name: reference,
  lender_tin: ein,
  account_number: reference,
  borrower_tin: tin,
  originated_on: date.refine(
    (s) => s <= "2026-12-31",
    "Loan must exist by year end",
  ),
  loan_agreement_reference: reference,
  loan_kind: z.enum(["original", "refinance", "consolidation", "revolving"]),
  original_loan_references: z.array(reference).default([]),
  qualification: z.object({
    review_reference: reference,
    legally_obligated: z.boolean(),
    solely_qualified_education_use: z.boolean(),
    unrelated_lender: z.boolean(),
    not_qualified_employer_plan: z.boolean(),
    student_tin: tin,
    student_relationship_at_borrowing: z.enum([
      "self",
      "spouse",
      "dependent",
      "other",
    ]),
    relationship_review_reference: reference,
    eligible_institution: z.boolean(),
    enrolled_at_least_half_time_in_degree_program: z.boolean(),
    expenses_within_reasonable_period: z.boolean(),
    education_expenses_net_of_tax_free_assistance: z.boolean(),
    expense_and_enrollment_record_reference: reference,
    refinance_same_borrower_and_qualified_use: z.boolean().optional(),
  }).strict(),
  opening_unpaid_origination_fees: money,
  opening_accrued_origination_fees: money,
  opening_capitalized_interest: money,
  opening_balance_record_reference: reference,
  fee_allocation_record_reference: reference,
  origination_fees_are_for_use_of_money: z.boolean(),
  payments: z.array(paymentSchema),
  reporting: reportingSchema,
}).strict();
export const studentLoanClaim2026Schema = z.object({
  tax_year: z.literal(2026),
  inventory_record_reference: reference,
  all_loans_payments_and_current_copies_included: z.literal(true),
  dependency_review: z.object({
    record_reference: reference,
    taxpayer_claimed_on_another_return: z.boolean(),
    spouse_claimed_on_another_return: z.boolean().optional(),
  }).strict(),
  // These addbacks need their owning 2555/4563/territory source routes.
  magi_review: z.object({
    record_reference: reference,
    no_foreign_housing_deduction: z.literal(true),
    no_puerto_rico_or_american_samoa_excluded_income: z.literal(true),
  }).strict(),
  f1098es: z.array(studentLoanCopy2026Schema).default([]),
  loans: z.array(studentLoan2026Schema).min(1),
}).strict();
export const studentLoanSource2026Schema = studentLoanClaim2026Schema.extend({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: tin,
  spouse_ssn: tin.optional(),
  taxpayer_can_be_claimed_as_dependent: z.boolean(),
  spouse_can_be_claimed_as_dependent: z.boolean().optional(),
}).strict();
export type StudentLoanSource2026 = z.input<typeof studentLoanSource2026Schema>;

/** Retain payment allocation and excluded funding before the shared return cap.
 * Publication 970 ch.4 payment order; 2026 1098-E instructions boxes 1/2.
 */
export function calculateStudentLoanSources2026(raw: StudentLoanSource2026) {
  const input = studentLoanSource2026Schema.parse(raw);
  const joint = input.filing_status === FilingStatus.MFJ;
  if (
    joint &&
    (!input.spouse_ssn ||
      input.spouse_can_be_claimed_as_dependent === undefined ||
      digits(input.spouse_ssn) === digits(input.taxpayer_ssn))
  ) {
    throw new Error(
      "Joint student-loan calculation needs distinct owners and dependency answers",
    );
  }
  const own = (id: string) =>
    digits(id) === digits(input.taxpayer_ssn) ||
    (joint && digits(id) === digits(input.spouse_ssn!));
  const copies = new Map(
    input.f1098es.map((c) => [c.source_document_reference, c]),
  );
  if (copies.size !== input.f1098es.length) {
    throw new Error("Duplicate 1098-E source reference");
  }
  // Reuse the 2025 current-copy/correction reconciliation, not its 2025 ledger dates.
  if (input.f1098es.length) {
    sharedCopiesSchema.parse({ f1098es: input.f1098es });
  }
  const copyTotals = new Map<string, number>();
  const loanIds = new Set<string>();
  const accounts = new Set<string>();
  const allocations = new Set<string>();
  const rows = input.loans.map((loan) => {
    if (!own(loan.borrower_tin)) {
      throw new Error("Student-loan borrower does not belong to this return");
    }
    const account = `${digits(loan.lender_tin)}:${digits(loan.borrower_tin)}:${
      key(loan.account_number)
    }`;
    if (loanIds.has(loan.loan_id) || accounts.has(account)) {
      throw new Error("Duplicate student loan/account");
    }
    loanIds.add(loan.loan_id);
    accounts.add(account);
    const q = loan.qualification;
    if (
      q.student_relationship_at_borrowing === "self" &&
      digits(q.student_tin) !== digits(loan.borrower_tin)
    ) {
      throw new Error(
        "Student-loan self education needs matching student and borrower",
      );
    }
    const refinanced = ["refinance", "consolidation"].includes(loan.loan_kind);
    if (
      refinanced !== (loan.original_loan_references.length > 0) ||
      (refinanced &&
        q.refinance_same_borrower_and_qualified_use === undefined) ||
      (!refinanced &&
        q.refinance_same_borrower_and_qualified_use !== undefined) ||
      new Set(loan.original_loan_references).size !==
        loan.original_loan_references.length ||
      loan.original_loan_references.includes(loan.loan_id)
    ) {
      throw new Error(
        "Refinanced/consolidated student loan needs original loan and use review",
      );
    }
    const eligibleLoan = q.legally_obligated &&
      q.solely_qualified_education_use &&
      q.unrelated_lender && q.not_qualified_employer_plan &&
      q.student_relationship_at_borrowing !== "other" &&
      q.eligible_institution &&
      q.enrolled_at_least_half_time_in_degree_program &&
      q.expenses_within_reasonable_period &&
      q.education_expenses_net_of_tax_free_assistance &&
      (!refinanced || q.refinance_same_borrower_and_qualified_use === true);
    let fees = cents(loan.opening_unpaid_origination_fees);
    let accrued = cents(loan.opening_accrued_origination_fees);
    let capitalized = cents(loan.opening_capitalized_interest);
    if (accrued > fees) {
      throw new Error("Accrued origination fees exceed unpaid fees");
    }
    if (
      !loan.origination_fees_are_for_use_of_money &&
      (fees || accrued ||
        loan.payments.some((p) => p.origination_fee_accrued > 0))
    ) {
      throw new Error(
        "Service/processing fees cannot be student-loan interest",
      );
    }
    let lastDate = loan.originated_on;
    const paymentRecords = new Set<string>();
    const payments = loan.payments.map((p) => {
      if (allocations.has(p.allocation_reference)) {
        throw new Error("Duplicate student-loan payment allocation");
      }
      allocations.add(p.allocation_reference);
      if (paymentRecords.has(p.payment_record_reference)) {
        throw new Error("Duplicate payment record within student loan");
      }
      paymentRecords.add(p.payment_record_reference);
      if (p.paid_on < lastDate) {
        throw new Error(
          "Student-loan payments must follow loan origination and chronological order",
        );
      }
      lastDate = p.paid_on;
      accrued += cents(p.origination_fee_accrued);
      capitalized += cents(p.capitalized_interest_added);
      if (accrued > fees) {
        throw new Error(
          "Origination fee schedule exceeds remaining fee balance",
        );
      }
      const stated = cents(p.stated_interest_paid);
      let cash = cents(p.amount_paid) - stated;
      if (cash < 0) throw new Error("Stated interest exceeds cash paid");
      const paidFees = Math.min(cash, accrued);
      cash -= paidFees;
      fees -= paidFees;
      accrued -= paidFees;
      const paidCapitalized = Math.min(cash, capitalized);
      cash -= paidCapitalized;
      capitalized -= paidCapitalized;
      const interest = stated + paidFees + paidCapitalized;
      const taxFree = p.funding.startsWith("tax_free_") ||
        p.funding === "other_tax_free_repayment_assistance";
      if (
        p.funding === "529_distribution" &&
        p.qtp_tax_free_earnings_used_for_interest === undefined
      ) {
        throw new Error(
          "529 payment needs reviewed tax-free earnings used for interest",
        );
      }
      const qtp = cents(p.qtp_tax_free_earnings_used_for_interest ?? 0);
      if (p.funding !== "529_distribution" && qtp > 0) {
        throw new Error("QTP earnings need a 529 distribution payment");
      }
      const excluded = taxFree ? interest : qtp;
      const elsewhere = cents(p.interest_deducted_elsewhere);
      if (excluded + elsewhere > interest) {
        throw new Error(
          "Student-loan interest exclusions overlap or exceed paid interest",
        );
      }
      return {
        ...p,
        stated_interest: stated / 100,
        origination_fee_interest: paidFees / 100,
        capitalized_interest: paidCapitalized / 100,
        principal: cash / 100,
        interest: interest / 100,
        excluded_funding: excluded / 100,
        eligible_interest: eligibleLoan
          ? (interest - excluded - elsewhere) / 100
          : 0,
      };
    });
    const total = (
      field:
        | "interest"
        | "stated_interest"
        | "origination_fee_interest"
        | "capitalized_interest"
        | "eligible_interest",
    ) => payments.reduce((n, p) => n + cents(p[field]), 0);
    const reporting = loan.reporting;
    if (reporting.kind === "1098e") {
      const copy = copies.get(reporting.statement_reference);
      if (!copy || digits(copy.lender_tin) !== digits(loan.lender_tin)) {
        throw new Error(
          "Student-loan reporting needs matching issued lender copy",
        );
      }
      const borrower = digits(copy.borrower_tin);
      if (
        /^[Xx*]/.test(borrower)
          ? (!copy.borrower_owner_review_reference ||
            borrower.slice(-4) !== digits(loan.borrower_tin).slice(-4))
          : borrower !== digits(loan.borrower_tin)
      ) {
        throw new Error("1098-E borrower identity does not match loan owner");
      }
      const includedFees = cents(reporting.origination_fees_in_box1);
      const includedCapitalized = cents(reporting.capitalized_interest_in_box1);
      if (
        includedFees > total("origination_fee_interest") ||
        includedCapitalized > total("capitalized_interest") ||
        cents(reporting.box1_allocated_to_loan) !==
          total("stated_interest") + includedFees + includedCapitalized
      ) {
        throw new Error(
          "1098-E box 1 allocation disagrees with paid interest components",
        );
      }
      const omitted = total("interest") -
        cents(reporting.box1_allocated_to_loan);
      if (
        omitted &&
        (loan.originated_on >= "2004-09-01" ||
          !copy.box2_origination_fees_excluded)
      ) {
        throw new Error(
          "Omitted paid interest needs a pre-September-2004 loan and box 2 review",
        );
      }
      copyTotals.set(
        reporting.statement_reference,
        (copyTotals.get(reporting.statement_reference) ?? 0) +
          cents(reporting.box1_allocated_to_loan),
      );
    }
    return {
      loan_id: loan.loan_id,
      eligible_loan: eligibleLoan,
      payments,
      interest_paid: total("interest") / 100,
      reportable_interest_for_threshold: (loan.originated_on < "2004-09-01"
        ? total("stated_interest")
        : total("interest")) / 100,
      eligible_interest: total("eligible_interest") / 100,
      closing_unpaid_origination_fees: fees / 100,
      closing_accrued_origination_fees: accrued / 100,
      closing_capitalized_interest: capitalized / 100,
    };
  });
  for (const copy of input.f1098es) {
    if (
      copyTotals.get(copy.source_document_reference) !==
        cents(copy.box1_student_loan_interest)
    ) {
      throw new Error(
        "1098-E issued total must reconcile to all allocated loans",
      );
    }
  }
  for (const loan of input.loans) {
    if (
      loan.reporting.kind !== "no_form" ||
      loan.reporting.reason !== "below_reporting_threshold"
    ) continue;
    const total = input.loans.reduce((n, other, i) =>
      n +
      (digits(other.lender_tin) === digits(loan.lender_tin) &&
          digits(other.borrower_tin) === digits(loan.borrower_tin)
        ? cents(rows[i].reportable_interest_for_threshold)
        : 0), 0);
    if (total >= 60000) {
      throw new Error(
        "1098-E reporting threshold applies across this lender's loans to one borrower",
      );
    }
  }
  const dependency = input.dependency_review;
  if (
    (dependency.taxpayer_claimed_on_another_return &&
      !input.taxpayer_can_be_claimed_as_dependent) ||
    (joint && dependency.spouse_claimed_on_another_return === undefined) ||
    (dependency.spouse_claimed_on_another_return &&
      (!joint || !input.spouse_can_be_claimed_as_dependent))
  ) {
    throw new Error(
      "Student-loan dependency review conflicts with filer facts or lacks the joint spouse answer",
    );
  }
  const disallowed = input.filing_status === FilingStatus.MFS
    ? "married_filing_separately"
    : dependency.taxpayer_claimed_on_another_return ||
        (joint && dependency.spouse_claimed_on_another_return)
    ? "filer_claimed_as_dependent"
    : undefined;
  const eligible =
    rows.reduce((n, row) => n + cents(row.eligible_interest), 0) / 100;
  if (
    !Number.isSafeInteger(cents(eligible)) ||
    rows.some((r) => !Number.isSafeInteger(cents(r.interest_paid)))
  ) throw new Error("Student-loan totals exceed supported cents range");
  return {
    source_input: input,
    loans: rows,
    eligible_interest_before_return_limit: eligible,
    disallowed_reason: disallowed,
    interest_before_magi: disallowed ? 0 : cappedStudentLoanInterest(eligible),
  };
}
