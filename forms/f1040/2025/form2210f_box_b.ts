import { z } from "zod";

const amount = z.number().int().nonnegative();
const sourceReference = z.string().trim().min(1);

const grossIncomeYearSchema = z.object({
  tax_year: z.union([z.literal(2024), z.literal(2025)]),
  total_gross_income: amount,
  farming_fishing_gross_income: amount,
  reviewed_source_reference: sourceReference,
}).strict().superRefine((year, context) => {
  if (year.farming_fishing_gross_income > year.total_gross_income) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 2210-F farming/fishing gross income exceeds total gross income",
    });
  }
});

const priorSeparateReturnSchema = z.object({
  owner: z.enum(["taxpayer", "spouse"]),
  filing_status: z.enum(["single", "head_of_household", "married_filing_separately"]),
  full_twelve_months: z.literal(true),
  filed_return_reference: sourceReference,
  line22_tax_after_credits: amount,
  included_schedule2_taxes: amount,
  line4_refundable_credits_excluding_schedule3_line11: amount,
}).strict();

export const form2210FBoxBInputSchema = z.object({
  gross_income_years: z.tuple([grossIncomeYearSchema, grossIncomeYearSchema]),
  prior_separate_returns: z.tuple([
    priorSeparateReturnSchema,
    priorSeparateReturnSchema,
  ]),
  current_return_reference: sourceReference,
  current_filing_status: z.literal("married_filing_jointly"),
  current_line22_tax_after_credits: amount,
  current_included_schedule2_taxes: amount,
  current_line4_refundable_credits_excluding_schedule3_line11: amount,
  current_withholding: amount,
  current_excess_social_security_or_rrta_withholding: amount,
  estimated_payments_by_2026_01_15: amount,
  full_underpayment_paid_on: z.string().regex(/^2026-\d{2}-\d{2}$/).nullable(),
}).strict();

export type Form2210FBoxBInput = z.infer<typeof form2210FBoxBInputSchema>;

export const form2210FBoxBLinesSchema = z.object({
  box_b: z.literal(true),
  line1: amount,
  line2: amount,
  line3: amount,
  line4: amount,
  line6: amount,
  line7: amount,
  line8: amount,
  line9: amount,
  line10: amount,
  line11: amount,
  line12: amount,
  line13: amount,
  line14: z.string().regex(/^2026-\d{2}-\d{2}$/).nullable(),
  line15: amount,
  line16: amount,
}).strict();

export type Form2210FBoxBLines = z.infer<typeof form2210FBoxBLinesSchema>;

function qualifiesAsFarmerOrFisher(input: Form2210FBoxBInput): boolean {
  return input.gross_income_years.some((year) =>
    year.total_gross_income > 0 &&
    year.farming_fishing_gross_income * 3 >= year.total_gross_income * 2
  );
}

function priorReturnTax(
  prior: z.infer<typeof priorSeparateReturnSchema>,
): number {
  return Math.max(
    0,
    prior.line22_tax_after_credits + prior.included_schedule2_taxes -
    prior.line4_refundable_credits_excluding_schedule3_line11,
  );
}

function utcDate(iso: string): Date {
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== iso
  ) {
    throw new Error("Form 2210-F needs a valid 2026 payment date");
  }
  return parsed;
}

function penaltyDays(paidOn: string | null): { date: string; days: number } {
  const start = utcDate("2026-01-15");
  const end = utcDate("2026-04-15");
  const date = paidOn ?? "2026-04-15";
  const paid = utcDate(date);
  if (paid <= start || paid > end) {
    throw new Error(
      "Form 2210-F box B route needs one full underpayment settlement after January 15 and by April 15, 2026",
    );
  }
  return { date, days: Math.round((paid.getTime() - start.getTime()) / 86_400_000) };
}

/** Calculate the changed-joint-status box-B branch from reviewed return facts.
 * The caller must reconcile current amounts to the finalized 1040/Schedules 2-3
 * and prior amounts to both filed 2024 returns before treating this as filing data. */
export function calculateForm2210FBoxB(raw: unknown): Form2210FBoxBLines {
  const input = form2210FBoxBInputSchema.parse(raw);
  if (
    input.gross_income_years[0].tax_year !== 2024 ||
    input.gross_income_years[1].tax_year !== 2025 ||
    !qualifiesAsFarmerOrFisher(input)
  ) {
    throw new Error("Form 2210-F needs reviewed 2024/2025 gross income proving the two-thirds farming or fishing test");
  }
  if (
    input.prior_separate_returns[0].owner !== "taxpayer" ||
    input.prior_separate_returns[1].owner !== "spouse" ||
    input.prior_separate_returns[0].filed_return_reference ===
      input.prior_separate_returns[1].filed_return_reference
  ) {
    throw new Error("Form 2210-F box B needs distinct filed 2024 taxpayer and spouse returns");
  }
  const line1 = input.current_line22_tax_after_credits;
  const line2 = input.current_included_schedule2_taxes;
  const line3 = line1 + line2;
  const line4 = input.current_line4_refundable_credits_excluding_schedule3_line11;
  const line6 = Math.max(0, line3 - line4);
  const line7 = Math.round(line6 * 0.667);
  const line8 = input.current_withholding +
    input.current_excess_social_security_or_rrta_withholding;
  const line9 = Math.max(0, line6 - line8);
  const line10 = input.prior_separate_returns.reduce(
    (sum, prior) => sum + priorReturnTax(prior),
    0,
  );
  if (line3 < 1000 || line6 < 1000 || line9 < 1000 || line10 >= line7) {
    throw new Error("Form 2210-F box B attachment conditions are not met");
  }
  const line11 = Math.min(line7, line10);
  const line12 = line8 + input.estimated_payments_by_2026_01_15;
  const line13 = Math.max(0, line11 - line12);
  const penaltyPeriod = line13 > 0
    ? penaltyDays(input.full_underpayment_paid_on)
    : undefined;
  return form2210FBoxBLinesSchema.parse({
    box_b: true,
    line1,
    line2,
    line3,
    line4,
    line6,
    line7,
    line8,
    line9,
    line10,
    line11,
    line12,
    line13,
    line14: penaltyPeriod?.date ?? null,
    line15: penaltyPeriod?.days ?? 0,
    line16: line13 > 0
      ? Math.round(line13 * (penaltyPeriod?.days ?? 0) / 365 * 0.07)
      : 0,
  });
}
