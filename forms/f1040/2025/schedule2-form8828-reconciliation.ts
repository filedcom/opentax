import {
  computeF8828Lines,
  inputSchema as f8828InputSchema,
} from "../nodes/inputs/f8828/index.ts";

/** Replay retained Form 8828 line 23 totals into Schedule 2 line 17b. */
export function assertSchedule2Form8828Tax(
  pending: Readonly<Record<string, unknown>>,
): void {
  const raw = pending.f8828;
  const items = raw === undefined ? [] : f8828InputSchema.parse(raw).f8828s;
  const tax = items.reduce(
    (sum, item) => sum + computeF8828Lines(item).line23_tax,
    0,
  );
  const schedule2 = pending.schedule2 as
    | Readonly<Record<string, unknown>>
    | undefined;
  if ((schedule2?.line17b_mortgage_subsidy_recapture ?? 0) !== tax) {
    throw new Error(
      "Schedule 2 line 17b differs from retained Form 8828 tax",
    );
  }
}
