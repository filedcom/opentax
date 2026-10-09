import { z } from "zod";

const money = z.number().nonnegative().refine(
  (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
  "Amounts must have at most two decimal places",
);

export const circulationScheduleSchema = z.object({
  owner_tin: z.string().regex(/^\d{9}$/),
  calendar_year_taxpayer_confirmed: z.literal(true),
  section173_eligible_costs_confirmed: z.literal(true),
  no_section173_capitalization_election_confirmed: z.literal(true),
  costs_paid_or_incurred_year: z.number().int().min(1987),
  cost_records: z.array(
    z.object({
      source_reference: z.string().trim().min(1),
      amount: money.refine((value) => value > 0, "Cost must be positive"),
    }).strict(),
  ).min(1),
  prior_years: z.array(
    z.object({
      tax_year: z.number().int().min(1987),
      regular_deduction: money,
      amt_deduction: money,
      reviewed_return_reference: z.string().trim().min(1),
    }).strict(),
  ),
}).strict();

export const circulationDeductionSchema = z.object({
  original_amount: money,
  remaining_unamortized: money,
  amortization_period_start: z.string(),
  regular_three_year_writeoff_elected: z.boolean().optional(),
  regular_tax_deduction: money.optional(),
  amt_deduction: money.optional(),
  circulation_cost_schedule: circulationScheduleSchema.optional(),
});

// Allocate cents across the three tax years without losing the final remainder.
function annualDeduction(original: number, elapsed: number): number {
  if (elapsed < 0 || elapsed > 2) return 0;
  const cents = Math.round(original * 100);
  const annual = Math.round(cents / 3);
  return (elapsed === 2 ? cents - 2 * annual : annual) / 100;
}

function deductionsForYear(
  original: number,
  elapsed: number,
  elected: boolean,
) {
  const amt = annualDeduction(original, elapsed);
  return {
    regular_tax_deduction: elected ? amt : elapsed === 0 ? original : 0,
    amt_deduction: amt,
  };
}

function assertPriorDeductions(
  schedule: z.infer<typeof circulationScheduleSchema>,
  original: number,
  elapsed: number,
  elected: boolean,
): number {
  const count = Math.min(elapsed, 3);
  if (schedule.prior_years.length !== count) {
    throw new Error(
      "Circulation amortization needs every prior deduction year",
    );
  }
  const references = schedule.prior_years.map((row) =>
    row.reviewed_return_reference
  );
  if (new Set(references).size !== count) {
    throw new Error(
      "Circulation amortization needs distinct prior-return reviews",
    );
  }
  let deductedCents = 0;
  for (let offset = 0; offset < count; offset++) {
    const rows = schedule.prior_years.filter((row) =>
      row.tax_year === schedule.costs_paid_or_incurred_year + offset
    );
    const expected = deductionsForYear(original, offset, elected);
    if (
      rows.length !== 1 ||
      rows[0].regular_deduction !== expected.regular_tax_deduction ||
      rows[0].amt_deduction !== expected.amt_deduction
    ) {
      throw new Error(
        "Circulation prior deductions differ from the three-year schedule",
      );
    }
    deductedCents += Math.round(expected.amt_deduction * 100);
  }
  return deductedCents;
}

/** Resolve reviewed amounts or calculate a source-backed three-year schedule. */
export function resolveCirculationDeductions(
  raw: z.infer<typeof circulationDeductionSchema>,
  taxYear: number,
) {
  if (!raw.circulation_cost_schedule) {
    return {
      regular_tax_deduction: raw.regular_tax_deduction,
      amt_deduction: raw.amt_deduction,
    };
  }
  const item = circulationDeductionSchema.parse(raw);
  const schedule = item.circulation_cost_schedule!;
  const elected = item.regular_three_year_writeoff_elected;
  const elapsed = taxYear - schedule.costs_paid_or_incurred_year;
  const sourceCents = schedule.cost_records.reduce(
    (sum, cost) => sum + Math.round(cost.amount * 100),
    0,
  );
  const references = schedule.cost_records.map((cost) => cost.source_reference);
  if (
    !Number.isInteger(taxYear) || elapsed < 0 || elected === undefined ||
    item.amortization_period_start !==
      `${schedule.costs_paid_or_incurred_year}-01-01` ||
    sourceCents !== Math.round(item.original_amount * 100) ||
    new Set(references).size !== references.length
  ) {
    throw new Error(
      "Circulation amortization needs matching dated costs and election facts",
    );
  }
  const deductedCents = assertPriorDeductions(
    schedule,
    item.original_amount,
    elapsed,
    elected,
  );
  if (
    Math.round(item.remaining_unamortized * 100) !== sourceCents - deductedCents
  ) {
    throw new Error(
      "Circulation opening AMT balance differs from the reviewed prior deductions",
    );
  }
  const result = deductionsForYear(item.original_amount, elapsed, elected);
  if (
    (item.regular_tax_deduction !== undefined &&
      item.regular_tax_deduction !== result.regular_tax_deduction) ||
    (item.amt_deduction !== undefined &&
      item.amt_deduction !== result.amt_deduction)
  ) {
    throw new Error(
      "Circulation entered deductions differ from the three-year schedule",
    );
  }
  return result;
}

export function assertDistinctCirculationCosts(
  schedules: Array<z.infer<typeof circulationScheduleSchema> | undefined>,
): void {
  const references = schedules.flatMap((schedule) =>
    schedule?.cost_records.map((cost) => cost.source_reference) ?? []
  );
  if (new Set(references).size !== references.length) {
    throw new Error(
      "Circulation pools cannot reuse the same source cost record",
    );
  }
}
