import { z } from "zod";

/**
 * Net earnings from ministerial services for one minister without an approved
 * Form 4361: W-2 ministerial wages, the housing allowance paid and a
 * parsonage's fair rental value plus utilities, less unreimbursed ministerial
 * expenses (Pub 517, "Figuring Net Earnings"). It may be a loss. Each row names
 * its owner and the W-2 it was reconciled to, so an unsourced amount never
 * reaches Schedule SE.
 */
export const ministerialSourceSchema = z.object({
  recipient: z.enum(["T", "S"]),
  source_reference: z.string().trim().min(1),
  net_earnings: z.number().finite(),
}).strict();

export type MinisterialSource = z.infer<typeof ministerialSourceSchema>;

/** Sum of the sourced ministerial rows, or undefined when there are none. */
export function ministerialEarnings(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const rows = z.array(ministerialSourceSchema).parse(raw);
  if (rows.length === 0) return undefined;
  if (
    new Set(rows.map((row) => row.source_reference)).size !== rows.length
  ) {
    throw new Error("Schedule SE ministerial source reference is reused");
  }
  return rows.reduce((sum, row) => sum + row.net_earnings, 0);
}

/**
 * Schedule SE line 2 for one proprietor: Schedule C and partnership earnings
 * plus ministerial earnings (i1040sse 2025, "Ministers, Members of Religious
 * Orders, and Christian Science Practitioners": "include this income on
 * Schedule SE, line 2"). The retained net_profit_schedule_c stays the
 * Schedule C/K-1 amount, so business consumers keep their own source.
 */
export function withMinisterialEarnings<
  T extends {
    readonly net_profit_schedule_c?: number | null;
    readonly ministerial_sources?: unknown;
  },
>(input: T): T {
  const ministerial = ministerialEarnings(input.ministerial_sources);
  if (ministerial === undefined) return input;
  return {
    ...input,
    net_profit_schedule_c: (input.net_profit_schedule_c ?? 0) + ministerial,
  };
}
