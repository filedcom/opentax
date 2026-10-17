import { z } from "zod";
import {
  calculateForm8582CR,
  inputSchema,
} from "./index.ts";
import { creditSourceSchema } from "./source.ts";

const currentYearRowSchema = z.object({
  source: creditSourceSchema,
  originating_tax_year: z.literal(2025),
  total_credit: z.number().int().positive(),
  allowed_credit: z.number().int().nonnegative(),
  unallowed_credit: z.number().int().nonnegative(),
}).strict();

export const currentYearCarryforwardLedgerSchema = z.object({
  version: z.literal(1),
  tax_year: z.literal(2025),
  rows: z.array(currentYearRowSchema).min(1),
  total_credit: z.number().int().positive(),
  allowed_credit: z.number().int().nonnegative(),
  unallowed_credit: z.number().int().nonnegative(),
}).strict().superRefine((ledger, ctx) => {
  const totals = ledger.rows.reduce(
    (sum, row) => ({
      total: sum.total + row.total_credit,
      allowed: sum.allowed + row.allowed_credit,
      unallowed: sum.unallowed + row.unallowed_credit,
    }),
    { total: 0, allowed: 0, unallowed: 0 },
  );
  if (
    totals.total !== ledger.total_credit ||
    totals.allowed !== ledger.allowed_credit ||
    totals.unallowed !== ledger.unallowed_credit ||
    totals.allowed + totals.unallowed !== totals.total ||
    ledger.rows.some((row) =>
      row.source.prior_unallowed_credits.length !== 0 ||
      row.source.current_year_credit !== row.total_credit ||
      row.allowed_credit + row.unallowed_credit !== row.total_credit
    )
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 8582-CR current-year carryforward ledger does not reconcile",
    });
  }
});

/** Storage-ready Worksheet 9 result when all credit originates in TY2025. */
export function buildCurrentYearCarryforwardLedger(
  raw: z.infer<typeof inputSchema>,
) {
  const input = inputSchema.parse(raw);
  if (
    input.credit_sources.length === 0 ||
    input.credit_sources.some((source) =>
      source.prior_unallowed_credits.length > 0 ||
      source.current_year_credit === 0
    )
  ) {
    throw new Error(
      "Form 8582-CR current-year ledger needs only identified 2025 credits; prior vintages need filed Worksheet 9",
    );
  }
  const lines = calculateForm8582CR(input);
  const rows = lines.sourceAllocations.map((allocation, index) => ({
    source: input.credit_sources[index],
    originating_tax_year: 2025 as const,
    total_credit: allocation.total_credit,
    allowed_credit: allocation.allowed_credit,
    unallowed_credit: allocation.unallowed_credit,
  }));
  return currentYearCarryforwardLedgerSchema.parse({
    version: 1,
    tax_year: 2025,
    rows,
    total_credit: lines.partI.line5,
    allowed_credit: lines.line37,
    unallowed_credit: lines.suspendedCredit,
  });
}
