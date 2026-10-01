import { z } from "zod";
import { readForm8582Ledger } from "./ledger.ts";

const openingRowSchema = z.object({
  activity_id: z.string().trim().min(1).max(64),
  reporting_part: z.enum(["viii", "ix"]),
  reporting_form: z.enum([
    "schedule_e",
    "form4835",
    "form4797_part1",
    "form4797_part2",
  ]),
  prior_unallowed_loss: z.number().int().positive().refine(Number.isSafeInteger),
}).strict();

export const form8582NextYearOpeningSchema = z.object({
  tax_year: z.literal(2026),
  prior_accepted_return_reference: z.string().trim().min(1),
  rows: z.array(openingRowSchema).min(1),
}).strict();

export type Form8582NextYearOpening = z.infer<
  typeof form8582NextYearOpeningSchema
>;

/** Verify a 2026 opening set against the original 2025 source and filed ledger. */
export function reconcileForm8582NextYearOpening(
  rawOpening: unknown,
  raw2025Ledger: unknown,
  original2025Input: unknown,
  accepted2025ReturnReference: string,
): Form8582NextYearOpening {
  const opening = form8582NextYearOpeningSchema.parse(rawOpening);
  const ledger = readForm8582Ledger(
    raw2025Ledger,
    original2025Input,
    accepted2025ReturnReference,
  );
  const expected = ledger.activities.flatMap((activity) =>
    activity.lines.filter((line) => line.ending_unallowed_loss > 0).map(
      (line) => ({
        activity_id: activity.activity_id,
        reporting_part: activity.reporting_part,
        reporting_form: line.reporting_form,
        prior_unallowed_loss: line.ending_unallowed_loss,
      }),
    )
  );
  const key = (row: z.infer<typeof openingRowSchema>) =>
    JSON.stringify([row.activity_id, row.reporting_part, row.reporting_form]);
  const actual = new Map(opening.rows.map((row) => [key(row), row]));
  const openingTotal = opening.rows.reduce(
    (sum, row) => sum + row.prior_unallowed_loss,
    0,
  );
  if (
    opening.prior_accepted_return_reference !==
      ledger.accepted_return_reference ||
    actual.size !== opening.rows.length ||
    actual.size !== expected.length ||
    expected.some((row) =>
      actual.get(key(row))?.prior_unallowed_loss !== row.prior_unallowed_loss
    ) ||
    !Number.isSafeInteger(openingTotal) ||
    openingTotal !== ledger.ending_unallowed_loss
  ) {
    throw new Error(
      "Form 8582 next-year opening rows differ from the 2025 filed activity, character, and loss ledger",
    );
  }
  return opening;
}
