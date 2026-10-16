import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import {
  form2441CreditRate2025,
  qualifyingPersonSchema,
} from "../../nodes/intermediate/forms/credits/individual/form2441/calculation.ts";

const whole = z.number().int().nonnegative();
const ref = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{9}$/);
const priorReturnSchema = z.object({
  tax_year: z.literal(2025),
  return_record_reference: ref,
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
  filing_status: z.nativeEnum(FilingStatus),
  form2441_line_a_considered_unmarried: z.boolean(),
  complete_qualifying_person_inventory: z.literal(true),
  qualifying_people: z.array(
    qualifyingPersonSchema.omit({ credit_expenses_paid: true }).extend({
      over_12_and_disabled: z.boolean(),
      eligibility_in_2025_review_reference: ref,
    }).strict(),
  ).min(1).max(25),
  form2441_line3_expenses: whole,
  form2441_line4_earned_income: whole,
  form2441_line5_earned_income: whole,
  form2441_line6_credit_expenses: whole,
  form2441_line24_deducted_benefits: whole,
  form2441_line25_excluded_benefits: whole,
  form1040_line11a_agi: z.number().int(),
}).strict();
export const priorCarePayments2026Schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }).strict(),
  z.object({
    kind: z.literal("paid_2025_in_2026"),
    prior_return: priorReturnSchema,
    payments: z.array(
      z.object({
        receipt_reference: ref,
        provider_index: z.number().int().nonnegative(),
        person_ssn: ssn,
        incurred_start_date: z.string().date(),
        incurred_end_date: z.string().date(),
        paid_date: z.string().date(),
        qualified_expense_review_reference: ref,
        not_previously_claimed_deducted_or_reimbursed: z.literal(true),
        amount_paid: whole.positive(),
      }).strict(),
    ).min(1).max(500),
  }).strict(),
]);
export type PriorCarePayments2026 = z.input<typeof priorCarePayments2026Schema>;

/** Worksheet A, 2026 Form 2441 instructions p.7. Prior-year line amounts are
 * sourced from the 2025 return; no caller-supplied incremental credit is used. */
export function calculatePriorCareCredit2026(
  raw: PriorCarePayments2026,
  filer: {
    filing_status: FilingStatus;
    taxpayer_ssn: string;
    spouse_ssn?: string;
  },
  providers: { amount_paid: number }[],
) {
  const input = priorCarePayments2026Schema.parse(raw);
  if (input.kind === "none") return null;
  const p = input.prior_return;
  const normalize = (s?: string) => s?.replaceAll("-", "");
  if (p.taxpayer_ssn !== normalize(filer.taxpayer_ssn)) {
    throw new Error("Prior care return must identify the current taxpayer");
  }
  const joint = p.filing_status === FilingStatus.MFJ;
  if (
    joint !== (filer.filing_status === FilingStatus.MFJ) || (joint &&
      (!p.spouse_ssn || p.spouse_ssn === p.taxpayer_ssn ||
        p.spouse_ssn !== normalize(filer.spouse_ssn)))
  ) {
    throw new Error(
      "Changed joint filing unit needs prior-care allocation review",
    );
  }
  if (
    p.filing_status === FilingStatus.MFS &&
    !p.form2441_line_a_considered_unmarried
  ) {
    throw new Error(
      "Prior MFS care credit needs considered-unmarried eligibility",
    );
  }
  if (
    p.filing_status !== FilingStatus.MFS &&
    p.form2441_line_a_considered_unmarried
  ) throw new Error("Prior care line A is only for separate filers");
  if (
    !joint && p.form2441_line4_earned_income !== p.form2441_line5_earned_income
  ) throw new Error("Prior nonjoint Form 2441 line 5 must equal line 4");
  const people = new Map(
    p.qualifying_people.map((person) => [person.ssn, person]),
  );
  if (people.size !== p.qualifying_people.length) {
    throw new Error("Duplicate prior care qualifying person");
  }
  const providerPaid = providers.map(() => 0);
  const receipts = new Set<string>();
  for (const payment of input.payments) {
    if (!providers[payment.provider_index] || !people.has(payment.person_ssn)) {
      throw new Error(
        "Prior care payment references an unknown provider or person",
      );
    }
    if (
      !payment.incurred_start_date.startsWith("2025-") ||
      !payment.incurred_end_date.startsWith("2025-") ||
      payment.incurred_start_date > payment.incurred_end_date ||
      !payment.paid_date.startsWith("2026-")
    ) throw new Error("Worksheet A needs 2025 care paid in 2026");
    if (receipts.has(payment.receipt_reference)) {
      throw new Error("Duplicate prior care receipt");
    }
    receipts.add(payment.receipt_reference);
    providerPaid[payment.provider_index] += payment.amount_paid;
  }
  if (providerPaid.some((amount, i) => amount > providers[i].amount_paid)) {
    throw new Error("Prior care receipts exceed provider payments");
  }
  const line1 = p.form2441_line3_expenses;
  const line2 = input.payments.reduce((n, p) => n + p.amount_paid, 0);
  const line3 = line1 + line2;
  const line4 = people.size > 1 ? 6000 : 3000;
  const line5 = p.form2441_line24_deducted_benefits +
    p.form2441_line25_excluded_benefits;
  // Preserve the printed subtraction, including a negative unused limit.
  const line6 = line4 - line5;
  const line7 = Math.min(
    p.form2441_line4_earned_income,
    p.form2441_line5_earned_income,
  );
  const line8 = Math.min(line3, line6, line7);
  const line9 = p.form2441_line6_credit_expenses;
  if (line1 > Math.max(0, line6) || line9 !== Math.min(line1, line7)) {
    throw new Error(
      "Prior Form 2441 expense and earned-income lines do not reconcile",
    );
  }
  const line10 = line8 - line9;
  const line11 = p.form1040_line11a_agi;
  const line12 = form2441CreditRate2025(line11);
  const line13 = line10 > 0 ? Math.round(line10 * line12) : 0;
  return {
    source_input: input,
    provider_paid: providerPaid,
    receipt_references: [...receipts],
    lines: {
      line1,
      line2,
      line3,
      line4,
      line5,
      line6,
      line7,
      line8,
      line9,
      line10,
      line11,
      line12,
      line13,
    },
  };
}
