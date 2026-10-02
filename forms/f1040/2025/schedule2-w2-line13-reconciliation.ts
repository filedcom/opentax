import {
  Box12Code,
  inputSchema as w2InputSchema,
} from "../nodes/inputs/w2/index.ts";

/** Replays the two distinct W-2 box 12 sources printed together on line 13. */
export function assertSchedule2W2Line13Sources(
  pending: Readonly<Record<string, unknown>>,
): void {
  const schedule2 = pending.schedule2 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const w2s = pending.w2 === undefined
    ? []
    : w2InputSchema.parse(pending.w2).w2s;
  const entries = w2s.flatMap((item) => item.box12_entries ?? []);
  const total = (...codes: Box12Code[]) =>
    entries.filter((entry) => codes.includes(entry.code)).reduce(
      (sum, entry) => sum + entry.amount,
      0,
    );
  if (
    (schedule2?.uncollected_fica ?? 0) !==
      total(Box12Code.A, Box12Code.B) ||
    (schedule2?.uncollected_fica_gtl ?? 0) !==
      total(Box12Code.M, Box12Code.N)
  ) {
    throw new Error(
      "Schedule 2 line 13 differs from retained W-2 box 12 codes A/B/M/N",
    );
  }
}
