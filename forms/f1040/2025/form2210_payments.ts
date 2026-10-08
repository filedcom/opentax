import { z } from "zod";

const reference = z.string().trim().min(1);
const cents = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const dollars = cents.max(Math.floor(Number.MAX_SAFE_INTEGER / 100));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}, "Expected a real calendar date");
const review = {
  source_reference: reference,
  reviewer: reference,
  reviewed_on: date,
};

/** Calculation prerequisite only: these reviewed facts do not authenticate
 * payments or select the annual safe harbor from a finalized/prior return. */
export const form2210PaymentInputSchema = z.object({
  tax_year: z.literal(2025),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  required_annual_payment_dollars: dollars,
  required_payment_workpaper_reference: reference,
  equal_installments: z.literal(true),
  withholding_method: z.literal("equal_due_dates"),
  withholding: z.object({ amount_dollars: dollars, ...review }).strict(),
  early_filing_payment_exception: z.literal(false),
  disaster_relief: z.literal(false),
  waiver_requested: z.literal(false),
  payments: z.array(
    z.object({
      payment_id: reference,
      taxpayer_ssn: z.string().regex(/^\d{9}$/),
      tax_year: z.literal(2025),
      kind: z.enum(["estimated_tax", "return_balance"]),
      paid_on: date,
      amount_cents: cents.refine((value) => value > 0),
      ...review,
    }).strict(),
  ),
}).strict();

export type Form2210PaymentInput = z.infer<typeof form2210PaymentInputSchema>;
export const FORM2210_DUE_DATES = [
  "2025-04-15",
  "2025-06-15",
  "2025-09-15",
  "2026-01-15",
] as const;
const cutoff = "2026-04-15";
const rateEnds = ["2025-06-30", "2025-09-30", "2025-12-31", cutoff];
const rateStarts = ["2025-04-15", ...rateEnds.slice(0, -1)];
const day = (value: string) => Date.parse(`${value}T00:00:00Z`) / 86400000;
const safe = (value: number) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      "Form 2210 payment aggregate exceeds exact cent arithmetic",
    );
  }
  return value;
};

export type Form2210PenaltySegment = {
  installment: number;
  payment_id: string | null;
  amount_cents: number;
  paid_on: string;
  rate_period: number;
  from_exclusive: string;
  through_inclusive: string;
  days: number;
  annual_rate_percent: 7;
  // Exact penalty cents = numerator / 36,500. Round once after summation.
  penalty_cents_numerator: string;
};

/** Calendar-year regular installments with default equal-date withholding.
 * Actual-date withholding, AI, prior overpayment credits, January filing relief
 * and waivers need their own source reconciliation; this function cannot file. */
export function calculateForm2210Payments(raw: unknown) {
  const input = form2210PaymentInputSchema.parse(raw);
  const ids = new Set<string>();
  const payments = input.payments.map((payment) => {
    if (payment.taxpayer_ssn !== input.taxpayer_ssn) {
      throw new Error("Form 2210 payment belongs to another taxpayer");
    }
    if (ids.has(payment.payment_id)) {
      throw new Error("Duplicate Form 2210 payment identity");
    }
    if (payment.payment_id.startsWith("equal-withholding:")) {
      throw new Error("Form 2210 payment uses a reserved withholding identity");
    }
    ids.add(payment.payment_id);
    if (payment.paid_on < "2025-01-01" || payment.paid_on > cutoff) {
      throw new Error(
        "Form 2210 payment is outside the calculation year/window",
      );
    }
    if (payment.reviewed_on < payment.paid_on) {
      throw new Error("Form 2210 payment review predates the recorded payment");
    }
    if (payment.kind === "return_balance" && payment.paid_on < "2026-01-16") {
      throw new Error(
        "Early return payment needs its separate filing exception",
      );
    }
    // June 15 is Sunday. Retain the source date, but a June 16 estimated
    // payment is timely under the instructions' next-business-day rule.
    const line11_period_on = payment.kind === "estimated_tax" &&
        payment.paid_on === "2025-06-16"
      ? "2025-06-15"
      : payment.paid_on;
    return { ...payment, line11_period_on };
  }).sort((a, b) =>
    a.paid_on.localeCompare(b.paid_on) ||
    a.payment_id.localeCompare(b.payment_id)
  );
  const installment = safe(input.required_annual_payment_dollars * 25);
  const withholding = safe(input.withholding.amount_dollars * 25);
  const line11 = FORM2210_DUE_DATES.map(() => withholding);
  for (const payment of payments) {
    const column = FORM2210_DUE_DATES.findIndex((due) =>
      payment.line11_period_on <= due
    );
    if (column >= 0) {
      line11[column] = safe(line11[column] + payment.amount_cents);
    }
  }
  const columns: Array<Record<`line${number}`, number>> = [];
  for (let column = 0; column < 4; column++) {
    const previous = columns[column - 1];
    const line12 = previous?.line18 ?? 0;
    const line13 = safe(line11[column] + line12);
    const line14 = previous ? safe(previous.line16 + previous.line17) : 0;
    const line15 = Math.max(0, line13 - line14);
    columns.push({
      line10: installment,
      line11: line11[column],
      line12,
      line13,
      line14,
      line15,
      line16: Math.max(0, line14 - line13),
      line17: Math.max(0, installment - line15),
      line18: Math.max(0, line15 - installment),
    });
  }

  const outstanding: Array<
    { installment: number; due: string; cents: number }
  > = [];
  const segments: Form2210PenaltySegment[] = [];
  const timelyJunePayments = new Set(
    payments.filter((payment) =>
      payment.kind === "estimated_tax" && payment.paid_on === "2025-06-16"
    ).map((payment) => payment.payment_id),
  );
  let available = 0;
  const charge = (
    column: number,
    amount: number,
    through: string,
    id: string | null,
  ) => {
    // The grace date makes only the June installment timely. Older April
    // principal still accrues through the actual June 16 payment date.
    const penaltyThrough = column === 1 && id !== null &&
        timelyJunePayments.has(id)
      ? "2025-06-15"
      : through;
    for (let period = 0; period < 4; period++) {
      const from = FORM2210_DUE_DATES[column] > rateStarts[period]
        ? FORM2210_DUE_DATES[column]
        : rateStarts[period];
      const to = penaltyThrough < rateEnds[period]
        ? penaltyThrough
        : rateEnds[period];
      const days = Math.max(0, day(to) - day(from));
      if (!days) continue;
      segments.push({
        installment: column,
        payment_id: id,
        amount_cents: amount,
        paid_on: through,
        rate_period: period + 1,
        from_exclusive: from,
        through_inclusive: to,
        days,
        annual_rate_percent: 7,
        penalty_cents_numerator: (BigInt(amount) * 7n * BigInt(days))
          .toString(),
      });
    }
  };
  const apply = (amount: number, when: string, id: string) => {
    let remaining = amount;
    for (const debt of outstanding) {
      const applied = Math.min(debt.cents, remaining);
      if (applied > 0) {
        charge(debt.installment, applied, when, id);
        debt.cents -= applied;
        remaining -= applied;
      }
      if (!remaining) break;
    }
    available = safe(available + remaining);
  };
  const events = [
    ...FORM2210_DUE_DATES.map((when, column) => ({
      when,
      column,
      amount: withholding,
      id: `equal-withholding:${column}`,
    })),
    ...payments.map((payment) => ({
      when: payment.paid_on,
      column: -1,
      amount: payment.amount_cents,
      id: payment.payment_id,
    })),
  ].sort((a, b) =>
    a.when.localeCompare(b.when) || b.column - a.column ||
    a.id.localeCompare(b.id)
  );
  for (const event of events) {
    if (event.column >= 0) {
      const prepaid = Math.min(installment, available);
      available -= prepaid;
      outstanding.push({
        installment: event.column,
        due: event.when,
        cents: installment - prepaid,
      });
    }
    apply(event.amount, event.when, event.id);
  }
  for (const debt of outstanding) {
    if (debt.cents) charge(debt.installment, debt.cents, cutoff, null);
  }
  const numerator = segments.reduce(
    (total, s) => total + BigInt(s.penalty_cents_numerator),
    0n,
  );
  const penaltyCents = Number((numerator + 18250n) / 36500n);
  safe(penaltyCents);
  return {
    tax_year: 2025 as const,
    filingReady: false as const,
    paymentAuthenticityVerified: false as const,
    requiredAnnualPaymentReconciled: false as const,
    columns,
    payments,
    segments,
    computed_penalty_cents: penaltyCents,
    penalty_cents_numerator: numerator.toString(),
    penalty_cents_denominator: 36500,
    unpaid_installments_cents: outstanding.map((debt) => debt.cents),
    unapplied_payments_cents: available,
  };
}
