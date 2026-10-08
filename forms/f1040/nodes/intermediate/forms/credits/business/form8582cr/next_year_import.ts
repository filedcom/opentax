import { z } from "zod";
import {
  buildCurrentYearCarryforwardLedger,
  currentYearCarryforwardLedgerSchema,
} from "./carryforward-ledger.ts";
import { inputSchema } from "./index.ts";
import { creditSourceSchema } from "./source.ts";

const positiveAmount = z.number().int().positive().refine(Number.isSafeInteger);

export const filedForm8582CRLedgerSchema = z.object({
  accepted_return_reference: z.string().trim().min(1),
  ledger: currentYearCarryforwardLedgerSchema,
}).strict();

export const form8582CRNextYearOpeningSchema = z.object({
  tax_year: z.literal(2026),
  prior_accepted_return_reference: z.string().trim().min(1),
  rows: z.array(
    z.object({
      source: creditSourceSchema,
      originating_tax_year: z.literal(2025),
      prior_unallowed_credit: positiveAmount,
    }).strict(),
  ).min(1),
}).strict();

/** Verify every imported 2025 credit against the re-derived Worksheet 9. */
export function reconcileForm8582CRNextYearOpening(
  rawOpening: unknown,
  rawFiled2025Ledger: unknown,
  rawOriginal2025Input: unknown,
  accepted2025ReturnReference: string,
) {
  const opening = form8582CRNextYearOpeningSchema.parse(rawOpening);
  const filed = filedForm8582CRLedgerSchema.parse(rawFiled2025Ledger);
  const source = inputSchema.parse(rawOriginal2025Input);
  const rederived = buildCurrentYearCarryforwardLedger(source);
  const expected = rederived.rows.filter((row) => row.unallowed_credit > 0);
  const key = (row: { source: z.infer<typeof creditSourceSchema> }) =>
    JSON.stringify([
      row.source.activity_reference,
      row.source.source_document_reference,
      row.source.reporting_route,
      row.source.form3800_credit_line ?? null,
    ]);
  const actual = new Map(opening.rows.map((row) => [key(row), row]));
  const total = opening.rows.reduce(
    (sum, row) => sum + row.prior_unallowed_credit,
    0,
  );
  if (
    filed.accepted_return_reference !== accepted2025ReturnReference ||
    opening.prior_accepted_return_reference !==
      accepted2025ReturnReference ||
    JSON.stringify(filed.ledger) !== JSON.stringify(rederived) ||
    actual.size !== opening.rows.length ||
    actual.size !== expected.length ||
    !Number.isSafeInteger(total) ||
    total !== rederived.unallowed_credit ||
    expected.some((row) => {
      const imported = actual.get(key(row));
      return !imported || imported.prior_unallowed_credit !==
          row.unallowed_credit ||
        JSON.stringify(imported.source) !== JSON.stringify(row.source);
    })
  ) {
    throw new Error(
      "Form 8582-CR next-year opening differs from the filed 2025 activity, source, route, and unallowed-credit ledger",
    );
  }
  return opening;
}
