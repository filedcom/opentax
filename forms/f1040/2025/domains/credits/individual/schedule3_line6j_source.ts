import {
  computePersonalCreditAmounts,
  type F8911Input,
} from "../../../../nodes/inputs/credits/business/f8911/index.ts";

/** Keep the Form 8911 personal-use credit and Schedule 3 line 6j identical. */
export function assertSchedule3Line6jSource(
  filedAmount: unknown,
  source: unknown,
): void {
  if (source === undefined) {
    if (
      filedAmount !== undefined && filedAmount !== null && filedAmount !== 0
    ) {
      throw new Error("Schedule 3 line 6j needs a sourced Form 8911 credit");
    }
    return;
  }
  const expected = computePersonalCreditAmounts(source as F8911Input, true)
    ?.allowedCredit ?? 0;
  if ((filedAmount ?? 0) !== expected) {
    throw new Error(
      "Schedule 3 line 6j differs from the sourced Form 8911 allowed personal credit",
    );
  }
}
