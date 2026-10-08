import { inputSchema as f2439InputSchema } from "../../../nodes/inputs/f2439/index.ts";

/** Replay the Form 2439 box 2 credit before either Schedule 3 projection. */
export function assertSchedule3Line13aSource(
  filedAmount: unknown,
  source: unknown,
): { reportableCount: number; creditedIndices: number[] } {
  if (source === undefined) {
    if (
      filedAmount !== undefined && filedAmount !== null && filedAmount !== 0
    ) {
      throw new Error(
        "Schedule 3 line 13a needs sourced Form 2439 box 2 amounts",
      );
    }
    return { reportableCount: 0, creditedIndices: [] };
  }
  const reportable = f2439InputSchema.parse(source).f2439s.filter((item) =>
    (item.box1a ?? 0) > 0
  );
  const creditedIndices = reportable.flatMap((item, index) =>
    (item.box2 ?? 0) > 0 ? [index] : []
  );
  const total = reportable.reduce((sum, item) => sum + (item.box2 ?? 0), 0);
  if ((filedAmount ?? 0) !== total) {
    throw new Error(
      "Schedule 3 line 13a must equal sourced Form 2439 box 2 amounts",
    );
  }
  if (total > 0 && creditedIndices.length === 0) {
    throw new Error(
      "Schedule 3 line 13a needs sourced Form 2439 box 2 amounts",
    );
  }
  return { reportableCount: reportable.length, creditedIndices };
}
