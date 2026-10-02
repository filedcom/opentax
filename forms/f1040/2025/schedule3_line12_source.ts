import { calculateForm4136, inputSchema } from "../nodes/inputs/f4136/index.ts";

/** Reconcile the Form 4136 total with its Schedule 3 refundable credit. */
export function assertSchedule3Line12Source(
  filedAmount: unknown,
  source: unknown,
): void {
  if (source === undefined) {
    if (
      filedAmount !== undefined && filedAmount !== null && filedAmount !== 0
    ) {
      throw new Error("Schedule 3 line 12 needs sourced Form 4136 claims");
    }
    return;
  }
  const expected = calculateForm4136(inputSchema.parse(source));
  const cents = (value: unknown): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error(
        "Schedule 3 line 12 needs a nonnegative Form 4136 credit",
      );
    }
    const result = Math.round(value * 100);
    if (
      !Number.isSafeInteger(result) || Math.abs(value * 100 - result) > 0.000001
    ) {
      throw new Error("Schedule 3 line 12 needs cent precision");
    }
    return result;
  };
  if (cents(filedAmount) !== cents(expected)) {
    throw new Error("Schedule 3 line 12 differs from sourced Form 4136 claims");
  }
}
