import { z } from "zod";

// Distinct semantic contributions survive export normalization even when amounts equal.
export const qbiCapitalSourceSchema = z.object({
  source: z.enum([
    "f1099div.qualified_dividends",
    "form8814.qualified_dividends",
    "schedule_d.net_capital_gain",
  ]),
  amount: z.number().nonnegative().finite(),
}).strict();
export const qbiCapitalSourcesSchema = z.array(qbiCapitalSourceSchema)
  .superRefine((rows, ctx) => {
    if (new Set(rows.map((row) => row.source)).size !== rows.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "QBI capital contributions need distinct source identities",
      });
    }
  });
export function qbiCapitalTotal(input: {
  qbi_capital_sources?: z.infer<typeof qbiCapitalSourcesSchema>;
  net_capital_gain?: number | number[];
}, filed = false): number {
  if (input.qbi_capital_sources !== undefined) {
    return input.qbi_capital_sources.reduce(
      (sum, row) => sum + (filed ? Math.round(row.amount) : row.amount),
      0,
    );
  }
  const value = input.net_capital_gain;
  return Array.isArray(value)
    ? value.reduce((sum, amount) => sum + amount, 0)
    : value ?? 0;
}
