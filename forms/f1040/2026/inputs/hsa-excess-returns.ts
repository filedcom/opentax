import { FilingStatus } from "../../nodes/types.ts";
import { z } from "zod";
import { hsaQualifiedFunding2026Schema } from "./hsa-qualified-funding.ts";
import { calculateHsaCurrentContributions2026 } from "./hsa-current-contributions.ts";
import {
  type HsaDistributionSources2026,
  reconcileHsaDistributions2026,
} from "./hsa-distribution-source.ts";
import {
  compareHsaAmounts,
  hsaExactAmount,
  hsaExactArithmetic as math,
  roundHsaAmount,
} from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
import {
  isSourceMoney,
  sourceCents,
  sumSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
const ref = z.string().trim().min(1),
  date = z.string().date(),
  tin = z.string().regex(/^\d{9}$/);
const money = z.number().finite().nonnegative().max(10_000_000).refine(
  isSourceMoney,
);
const exact = (v: number) => hsaExactAmount(sourceCents(v), 100);
const deadline = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ordinary"),
    record_reference: ref,
    return_due_on: z.literal("2027-04-15"),
  }).strict(),
  z.object({
    kind: z.literal("form4868"),
    record_reference: ref,
    taxpayer_tin: tin,
    spouse_tin: tin.optional(),
    accepted_extension_reference: ref,
    filed_on: date,
    accepted_on: date,
    return_due_on: z.literal("2027-10-15"),
    valid_six_month_extension_verified: z.literal(true),
  }).strict(),
]);
export const hsaExcessReturns2026Schema = z.object({
  contribution_sources: hsaQualifiedFunding2026Schema,
  review: z.object({
    record_reference: ref,
    reviewed_on: date,
    deadline,
    all_current_year_excess_returns_and_payroll_inclusions_reviewed: z.literal(
      true,
    ),
    no_disaster_combat_zone_or_3019100_2_relief_claimed: z.literal(true),
    no_employer_recoveries_or_loss_adjusted_returns_verified: z.literal(true),
    owners: z.array(
      z.object({
        owner_tin: tin,
        payroll_review_reference: ref,
        all_2026_w2_excess_inclusions_reviewed: z.literal(true),
        w2_inclusions: z.array(
          z.object({
            source_document_reference: ref,
            employer_ein: tin,
            payroll_reconciliation_reference: ref,
            box1_wages_before_hsa_excess_inclusion: money,
            amount_included_for_2026_hsa_excess: money.refine((v) => v > 0),
            complete_box1_reconciliation_verified: z.literal(true),
          }).strict(),
        ).max(100),
      }).strict(),
    ).min(1).max(2),
    withdrawals: z.array(
      z.object({
        record_reference: ref,
        owner_tin: tin,
        trustee_tin: tin,
        account_number: ref,
        contribution_tax_year: z.literal(2026),
        contribution_kind: z.enum(["personal_cash", "employer_cash"]),
        contribution_allocations: z.array(
          z.object({
            receipt_reference: ref,
            principal: money.refine((v) => v > 0),
          }).strict(),
        ).min(1).max(1000),
        trustee_return_instruction_reference: ref,
        net_income_calculation_reference: ref,
        all_attributable_earnings_distributed_verified: z.literal(true),
        no_deduction_or_income_exclusion_for_returned_principal_verified: z
          .literal(true),
        payment: z.discriminatedUnion("kind", [
          z.object({
            kind: z.literal("current_year"),
            distribution_payment_reference: ref,
          }).strict(),
          z.object({
            kind: z.literal("following_year"),
            trustee_payment_reference: ref,
            custodian_transaction_identifier: ref,
            paid_on: date,
            owner_receipt_reference: ref,
            received_on: date,
            amount_received: money,
            gross_amount: money.refine((v) => v > 0),
            earnings_on_excess: money,
            paid_to: z.literal("hsa_owner"),
            current_custodian_paid_record_after_corrections_verified: z.literal(
              true,
            ),
          }).strict(),
        ]),
      }).strict(),
    ).max(1000),
  }).strict(),
}).strict();
export type HsaExcessReturns2026 = z.input<typeof hsaExcessReturns2026Schema>;

/** Reconcile actual distributions against actual contribution receipts before
 * treating a timely return as a line-14b exclusion or reducing current excess.
 * This workpaper retains income-year obligations; it does not register a return. */
export function reconcileHsaExcessReturns2026(
  raw: HsaExcessReturns2026,
  distributionSources: HsaDistributionSources2026,
) {
  const input = hsaExcessReturns2026Schema.parse(raw), review = input.review;
  const funding = calculateHsaCurrentContributions2026(
    input.contribution_sources,
  );
  const distributions = reconcileHsaDistributions2026(distributionSources);
  if (
    distributions.current_copies.some((c) =>
      c.box5_account_type !== "hsa" ||
      !["1", "2", "3"].includes(c.box3_distribution_code) ||
      c.box4_fmv_on_death !== 0
    )
  ) {
    throw Error(
      "HSA excess settlement needs ordinary owned HSA source accounts",
    );
  }
  const f = funding.source_input, d = distributions.source_input;
  if (
    funding.rollover_distribution_sources &&
    JSON.stringify(funding.rollover_distribution_sources) !==
      JSON.stringify(distributions.source_input)
  ) {
    throw Error(
      "HSA rollover and excess workpapers must use the same actual distribution inventory",
    );
  }

  if (
    f.filing_status !== d.filing_status || f.taxpayer_ssn !== d.taxpayer_ssn ||
    f.spouse_ssn !== d.spouse_ssn || review.reviewed_on < f.claim.reviewed_on ||
    review.reviewed_on < d.claim.reviewed_on ||
    review.reviewed_on < review.deadline.return_due_on ||
    (input.contribution_sources.qualified_funding_review?.reviewed_on ?? "") >
      review.reviewed_on ||
    (input.contribution_sources.rollover_review?.reviewed_on ?? "") >
      review.reviewed_on
  ) {
    throw Error(
      "HSA excess review must bind the same actual return and completed source/deadline reviews",
    );
  }
  const due = review.deadline;
  if (
    due.kind === "form4868" &&
    (due.taxpayer_tin !== d.taxpayer_ssn ||
      due.spouse_tin !==
        (d.filing_status === FilingStatus.MFJ ? d.spouse_ssn : undefined) ||
      due.filed_on < "2027-01-01" || due.filed_on > "2027-04-15" ||
      due.accepted_on < due.filed_on || due.accepted_on > review.reviewed_on)
  ) {
    throw Error(
      "HSA extended return deadline needs the same return's timely accepted Form 4868",
    );
  }
  const key = (a: { trustee_tin: string; account_number: string }) =>
    `${a.trustee_tin}/${a.account_number}`;
  if (
    f.claim.accounts.length !== distributions.accounts.length ||
    distributions.accounts.some((a) => {
      const original = f.claim.accounts.find((v) => key(v) === key(a));
      const eligibility = f.household_eligibility.owners.find((o) =>
        o.owner_tin === a.owner_tin
      );
      const dob = a.owner_tin === d.taxpayer_ssn
        ? d.taxpayer_dob
        : d.spouse_dob;
      return !original || original.owner_tin !== a.owner_tin ||
        original.opened_on !== a.opened_on || !eligibility ||
        eligibility.owner_dob !== dob;
    })
  ) {
    throw Error(
      "HSA funding and distributions need the same complete accounts and owner birth facts",
    );
  }
  if (
    review.owners.length !== funding.owners.length ||
    new Set(review.owners.map((o) => o.owner_tin)).size !==
      review.owners.length ||
    review.owners.some((o) =>
      !funding.owners.some((v) => v.owner_tin === o.owner_tin)
    )
  ) throw Error("HSA excess reviews must cover each actual funding owner once");
  const records = new Set<string>(),
    usedPayments = new Set<string>(),
    postTransactions = new Set<string>();
  const allocated = new Map<string, number>();
  const withdrawals = review.withdrawals.map((w) => {
    if (records.has(w.record_reference)) {
      throw Error("HSA excess review repeats a withdrawal record");
    }
    records.add(w.record_reference);
    const a = f.claim.accounts.find((a) => key(a) === key(w));
    if (!a || a.owner_tin !== w.owner_tin) {
      throw Error(
        "HSA excess withdrawal needs its actual owned funding account",
      );
    }
    const distributionAccount = distributions.accounts.find((v) =>
      key(v) === key(w)
    )!;
    let paidOn: string,
      gross: number,
      earnings: number,
      paymentReference: string;
    if (w.payment.kind === "current_year") {
      paymentReference = w.payment.distribution_payment_reference;
      const p = distributionAccount.payments.find((p) =>
        p.record_reference === paymentReference
      );
      const form = distributionAccount.current_copies.find((v) =>
        v.source_document_reference === p?.form1099sa_source_reference
      );
      if (
        !p || !form || form.box3_distribution_code !== "2" ||
        form.box5_account_type !== "hsa" || form.box4_fmv_on_death !== 0
      ) {
        throw Error(
          "HSA timely current return needs an actual current code-2 HSA payment",
        );
      }
      paidOn = p.distributed_on;
      gross = p.gross_amount;
      earnings = p.earnings_on_excess;
    } else {
      const p = w.payment;
      paymentReference = p.trustee_payment_reference;
      const transaction = `${key(w)}/${p.custodian_transaction_identifier}`;
      if (
        !p.paid_on.startsWith("2027-") || p.received_on !== p.paid_on ||
        p.amount_received !== p.gross_amount ||
        p.owner_receipt_reference === p.trustee_payment_reference ||
        postTransactions.has(transaction) ||
        distributionAccount.payments.some((v) =>
          v.record_reference === paymentReference ||
          v.custodian_transaction_identifier ===
            p.custodian_transaction_identifier
        )
      ) {
        throw Error(
          "HSA following-year return needs a distinct actual paid trustee transaction and owner receipt",
        );
      }
      postTransactions.add(transaction);
      paidOn = p.paid_on;
      gross = p.gross_amount;
      earnings = p.earnings_on_excess;
    }
    if (
      usedPayments.has(paymentReference) || paidOn > due.return_due_on ||
      paidOn > review.reviewed_on || earnings > gross
    ) {
      throw Error(
        "HSA excess return must be paid once within the evidenced return deadline",
      );
    }
    usedPayments.add(paymentReference);
    const principal = sumSourceMoney(
      w.contribution_allocations.map((c) => c.principal),
    );
    if (sourceCents(principal) + sourceCents(earnings) !== sourceCents(gross)) {
      throw Error(
        "HSA returned principal and all attributable earnings must equal the actual payment",
      );
    }
    const receipts = new Set<string>();
    for (const allocation of w.contribution_allocations) {
      const receipt = f.claim.accounts.filter((v) =>
        v.owner_tin === w.owner_tin
      )
        .flatMap((v) => v.receipts).find((r) =>
          r.record_reference === allocation.receipt_reference
        );
      if (
        !receipt || receipts.has(allocation.receipt_reference) ||
        receipt.kind !== w.contribution_kind ||
        !("contribution_tax_year" in receipt) ||
        receipt.contribution_tax_year !== 2026 || receipt.received_on > paidOn
      ) {
        throw Error(
          "HSA returned principal must identify actual same-kind 2026 contributions paid before withdrawal",
        );
      }
      receipts.add(allocation.receipt_reference);
      const amount = (allocated.get(receipt.record_reference) ?? 0) +
        sourceCents(allocation.principal);
      if (amount > sourceCents(receipt.amount)) {
        throw Error(
          "HSA returns cannot spend the same contribution receipt twice",
        );
      }
      allocated.set(receipt.record_reference, amount);
    }
    return {
      ...w,
      payment_reference: paymentReference,
      paid_on: paidOn,
      principal,
      earnings,
      gross_amount: gross,
      income_tax_year: paidOn.startsWith("2026-") ? 2026 : 2027,
    };
  });
  const current = withdrawals.filter((w) => w.income_tax_year === 2026);
  // Every code-2 payment must be settled; omitting a record is never a zero exclusion.
  for (const a of distributions.accounts) {
    for (const p of a.payments) {
      const form = a.current_copies.find((v) =>
        v.source_document_reference === p.form1099sa_source_reference
      )!;
      if (
        form.box3_distribution_code === "2" &&
        !current.some((w) => w.payment_reference === p.record_reference)
      ) throw Error("HSA excess review omits a current code-2 payment");
    }
  }
  const owners = funding.owners.map((o) => {
    const owned = withdrawals.filter((w) => w.owner_tin === o.owner_tin);
    const principal = (kind: string) =>
      sumSourceMoney(
        owned.filter((w) => w.contribution_kind === kind).map((w) =>
          w.principal
        ),
      );
    const personal = exact(principal("personal_cash")),
      employer = exact(principal("employer_cash"));
    const amounts = o.current_contributions.before_withdrawals_and_prior_excess;
    if (
      compareHsaAmounts(personal, amounts.personalExcess) > 0 ||
      compareHsaAmounts(employer, amounts.employerExcess) > 0
    ) {
      throw Error(
        "HSA returned principal exceeds the actual same-kind current contribution excess",
      );
    }
    const payroll = review.owners.find((r) => r.owner_tin === o.owner_tin)!;
    const w2refs = new Set<string>();
    let included = 0;
    for (const i of payroll.w2_inclusions) {
      const w2 = f.wage_sources.find((v) =>
        v.source_document_reference === i.source_document_reference
      );
      const deposited = f.claim.accounts.filter((a) =>
        a.owner_tin === o.owner_tin
      ).flatMap((a) => a.receipts).filter((r) =>
        r.kind === "employer_cash" && r.contribution_tax_year === 2026 &&
        r.current_w2_source_reference === i.source_document_reference
      ).reduce((n, r) => n + sourceCents(r.amount), 0);
      if (
        !w2 || w2refs.has(i.source_document_reference) ||
        w2.employee_ssn.replaceAll("-", "") !== o.owner_tin ||
        w2.employer_ein.replaceAll("-", "") !== i.employer_ein ||
        sourceCents(i.box1_wages_before_hsa_excess_inclusion) +
              sourceCents(i.amount_included_for_2026_hsa_excess) !==
          sourceCents(w2.box1_wages) ||
        sourceCents(i.amount_included_for_2026_hsa_excess) > deposited
      ) {
        throw Error(
          "HSA excess wage inclusion must reconcile the actual owner's employer deposits and complete W-2 box 1",
        );
      }
      w2refs.add(i.source_document_reference);
      included += sourceCents(i.amount_included_for_2026_hsa_excess);
    }
    const includedAmount = hsaExactAmount(included, 100);
    if (compareHsaAmounts(includedAmount, amounts.employerExcess) > 0) {
      throw Error("HSA W-2 inclusion exceeds the actual employer excess");
    }
    const retainedPersonal = math.subtractFloorZero(
      amounts.personalExcess,
      personal,
    );
    const retainedEmployer = math.subtractFloorZero(
      amounts.employerExcess,
      employer,
    );
    const employerIncome = math.subtractFloorZero(
      amounts.employerExcess,
      includedAmount,
    );
    const currentOwned = owned.filter((w) => w.income_tax_year === 2026);
    return {
      owner_tin: o.owner_tin,
      withdrawals: owned,
      exact_personal_principal_returned: personal,
      exact_employer_principal_returned: employer,
      exact_retained_personal_excess: retainedPersonal,
      exact_retained_employer_excess: retainedEmployer,
      exact_current_excess_after_returns: math.add(
        retainedPersonal,
        retainedEmployer,
      ),
      exact_employer_excess_already_in_wages: includedAmount,
      exact_employer_excess_other_income_2026: employerIncome,
      filed_employer_excess_other_income_2026: roundHsaAmount(employerIncome),
      gross_excluded_distributions_2026: sumSourceMoney(
        currentOwned.map((w) => w.gross_amount),
      ),
      excess_earnings_income_2026: sumSourceMoney(
        currentOwned.map((w) => w.earnings),
      ),
      following_year_income_records: owned.filter((w) =>
        w.income_tax_year === 2027
      ).map((w) => ({
        tax_year: 2027,
        owner_tin: w.owner_tin,
        payment_reference: w.payment_reference,
        paid_on: w.paid_on,
        gross_amount: w.gross_amount,
        principal: w.principal,
        earnings_other_income: w.earnings,
        source_2026_excess_review: review.record_reference,
      })),
    };
  });
  return {
    source_input: input,
    contribution_sources: funding,
    distribution_sources: distributions,
    withdrawals,
    owners,
  };
}
