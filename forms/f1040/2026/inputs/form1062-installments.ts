import { z } from "zod";
import {
  calculateForm1062Tax2026,
  type Form1062TaxSource2026,
} from "./form1062-tax.ts";

const ref = z.string().trim().min(1);
const date = z.string().date();
const cents = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const installment = z.number().int().min(1).max(4);

/** Internal evidence workpaper, not a public election or payment instruction. */
export const form1062InstallmentSource2026Schema = z.object({
  tax_year: z.literal(2026),
  record_reference: ref,
  election_reference: ref,
  taxpayer_tin: z.string().regex(/^\d{9}$/),
  spouse_tin: z.string().regex(/^\d{9}$/).optional(),
  as_of: date,
  filing: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("planned"), on: date }).strict(),
    z.object({ kind: z.literal("filed"), on: date, record_reference: ref })
      .strict(),
  ]),
  extension: z.object({
    record_reference: ref,
    requested_on: date,
    valid_six_month_filing_extension: z.literal(true),
  }).strict().optional(),
  review: z.object({
    record_reference: ref,
    domestic_calendar_year_individual: z.literal(true),
    no_special_deadline_relief_or_state_holiday_adjustment: z.literal(true),
    no_death_revocation_deficiency_or_addition_to_tax: z.literal(true),
    payment_and_event_records_complete_through_as_of: z.literal(true),
  }).strict(),
  // Only amounts evidenced as allocated to THIS election. Return withholding,
  // estimates, balances and bank debits do not establish this allocation.
  payments: z.array(
    z.object({
      record_reference: ref,
      account_record_reference: ref,
      effective_on: date,
      amount_cents: cents,
      allocations: z.array(
        z.object({
          installment,
          amount_cents: cents,
        }).strict(),
      ).min(1).max(4),
    }).strict(),
  ),
}).strict();
export type Form1062InstallmentSource2026 = z.input<
  typeof form1062InstallmentSource2026Schema
>;

// Restricted to the four ordinary calendar-year payment dates for this election.
// Pub. 509 / section 7503: weekends and D.C. Emancipation Day postpone April 15.
// State holidays, overseas, combat-zone and disaster relief require another owner.
function ordinaryPaymentDate(year: number): string {
  const holiday = new Date(Date.UTC(year, 3, 16));
  if (holiday.getUTCDay() === 6) holiday.setUTCDate(15);
  if (holiday.getUTCDay() === 0) holiday.setUTCDate(17);
  const due = new Date(Date.UTC(year, 3, 15));
  while (
    due.getUTCDay() === 0 || due.getUTCDay() === 6 ||
    due.getTime() === holiday.getTime()
  ) due.setUTCDate(due.getUTCDate() + 1);
  return due.toISOString().slice(0, 10);
}

/** Recompute the tax before deriving four equal, cent-precise obligations. */
export function calculateForm1062Installments2026(
  taxSource: Form1062TaxSource2026,
  raw: Form1062InstallmentSource2026,
) {
  const input = form1062InstallmentSource2026Schema.parse(raw);
  const tax = calculateForm1062Tax2026(taxSource);
  const owners = tax.gain_replay.actual.source_input;
  if (
    input.election_reference !== tax.source_input.election.record_reference ||
    input.taxpayer_tin !== owners.taxpayer_ssn ||
    input.spouse_tin !== owners.spouse_ssn
  ) {
    throw new Error(
      "Form 1062 installment records belong to another election or return",
    );
  }
  const totalCents = tax.lines.line14 * 100;
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new Error(
      "Form 1062 installments require positive, safely representable applicable net tax",
    );
  }
  // Line 14 is whole dollars, so a quarter is always an exact number of cents.
  // Do not multiply the independently rounded printed line 15 by four.
  const installmentCents = totalCents / 4;
  const firstDue = ordinaryPaymentDate(2027);
  const electionDue = input.extension ? "2027-10-15" : firstDue;
  if (input.as_of < "2027-01-01" || input.filing.on < "2027-01-01") {
    throw new Error(
      "Form 1062 election workpapers require a completed 2026 tax year",
    );
  }
  if (
    (input.filing.kind === "filed" && input.filing.on > input.as_of) ||
    (input.filing.kind === "planned" && input.filing.on < input.as_of)
  ) {
    throw new Error(
      "Form 1062 filing evidence conflicts with the workpaper date",
    );
  }
  if (
    input.extension &&
    (input.extension.requested_on < "2027-01-01" ||
      input.extension.requested_on > firstDue ||
      input.extension.requested_on > input.as_of ||
      input.extension.requested_on > input.filing.on)
  ) throw new Error("Form 1062 needs evidence of a timely filing extension");

  const references = new Set<string>();
  const allocations: {
    installment: number;
    amount_cents: number;
    effective_on: string;
    payment_reference: string;
    account_record_reference: string;
  }[] = [];
  for (const payment of input.payments) {
    if (references.has(payment.record_reference)) {
      throw new Error("Duplicate Form 1062 payment record");
    }
    references.add(payment.record_reference);
    if (
      payment.effective_on < "2026-01-01" || payment.effective_on > input.as_of
    ) {
      throw new Error(
        "Form 1062 payment evidence is outside the reviewed period",
      );
    }
    const seen = new Set<number>();
    let allocated = 0;
    for (const allocation of payment.allocations) {
      if (seen.has(allocation.installment)) {
        throw new Error(
          "Duplicate Form 1062 installment allocation within a payment",
        );
      }
      seen.add(allocation.installment);
      allocated += allocation.amount_cents;
      if (!Number.isSafeInteger(allocated)) {
        throw new Error(
          "Form 1062 payment allocations exceed safe cent precision",
        );
      }
      allocations.push({
        ...allocation,
        effective_on: payment.effective_on,
        payment_reference: payment.record_reference,
        account_record_reference: payment.account_record_reference,
      });
    }
    if (allocated !== payment.amount_cents) {
      throw new Error(
        "Form 1062 payment amount does not reconcile to its allocations",
      );
    }
  }

  const installments = [1, 2, 3, 4].map((number) => {
    const due = ordinaryPaymentDate(2026 + number);
    const evidence = allocations.filter((a) => a.installment === number);
    const paid = evidence.reduce((sum, a) => sum + a.amount_cents, 0);
    const timely = evidence.filter((a) => a.effective_on <= due).reduce(
      (sum, a) => sum + a.amount_cents,
      0,
    );
    if (!Number.isSafeInteger(paid) || paid > installmentCents) {
      throw new Error(
        "Form 1062 excess payment needs an evidenced allocation to remaining installments",
      );
    }
    const remaining = installmentCents - paid;
    const status = timely === installmentCents
      ? "paid_timely"
      : input.as_of > due
      ? remaining === 0
        ? "paid_late_review_required"
        : "overdue_review_required"
      : input.as_of === due
      ? "due_today"
      : "scheduled";
    return {
      installment: number,
      return_tax_year: 2025 + number,
      ordinary_due_on: due,
      amount_cents: installmentCents,
      paid_cents: paid,
      paid_by_due_date_cents: timely,
      remaining_cents: remaining,
      status,
      payment_evidence: evidence,
    };
  });
  const paymentReview = installments.some((i) =>
    i.status === "paid_late_review_required" ||
    i.status === "overdue_review_required"
  );
  const roundedFirstCents = tax.lines.line15 * 100;
  return {
    source_input: input,
    tax,
    election: {
      ordinary_due_on: firstDue,
      due_with_supported_extension: electionDue,
      filing_on: input.filing.on,
      status: input.filing.on > electionDue
        ? "late_review_required"
        : input.filing.kind === "filed"
        ? "reported_timely"
        : "planned_timely",
    },
    total_liability_cents: totalCents,
    remaining_liability_cents: installments.reduce(
      (s, i) => s + i.remaining_cents,
      0,
    ),
    installments,
    printed_first_installment_dollars: tax.lines.line15,
    printed_first_installment_difference_cents: roundedFirstCents -
      installmentCents,
    rounding_reconciliation_required: roundedFirstCents !== installmentCents,
    payment_or_acceleration_review_required: paymentReview,
    // No inferred penalty assessment, accelerated date, revocation or payment
    // allocation. These records must not authorize a public filing or settlement.
    filing_ready: false as const,
  };
}
