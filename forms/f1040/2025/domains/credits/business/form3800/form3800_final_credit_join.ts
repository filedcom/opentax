import { z } from "zod";

const money = z.number().finite().nonnegative();
const schedule3Schema = z.object({
  line6a_total: money.optional(),
  line8_total: money.optional(),
});
const form1040Schema = z.object({
  line20_nonrefundable_credits: money.optional(),
});

function cents(value: number): number {
  const result = Math.round(value * 100);
  if (
    !Number.isSafeInteger(result) ||
    Math.abs(value * 100 - result) > 0.000001
  ) {
    throw new Error("Form 3800 final credit join needs cent precision");
  }
  return result;
}

/** Form 3800 line 38 -> Schedule 3 line 6a -> line 8 -> Form 1040 line 20. */
export function assertForm3800FinalCreditJoin(
  allowedCredit: number,
  pending: Readonly<Record<string, unknown>>,
): void {
  const schedule3 = schedule3Schema.parse(pending.schedule3 ?? {});
  const form1040 = form1040Schema.parse(pending.f1040);
  const allowed = cents(allowedCredit);
  if (
    allowed > 0 &&
    (schedule3.line6a_total === undefined ||
      schedule3.line8_total === undefined ||
      form1040.line20_nonrefundable_credits === undefined)
  ) {
    throw new Error(
      "Positive Form 3800 credit needs explicit Schedule 3 lines 6a/8 and Form 1040 line 20",
    );
  }
  const line6a = cents(schedule3.line6a_total ?? 0);
  const line8 = cents(schedule3.line8_total ?? 0);
  const line20 = cents(form1040.line20_nonrefundable_credits ?? 0);
  if (
    allowed === 0
      ? line6a !== 0 || line8 !== 0 || line20 !== 0
      : allowed !== line6a || line8 < line6a || line8 !== line20
  ) {
    throw new Error(
      "Form 3800 line 38, Schedule 3 lines 6a/8, and Form 1040 line 20 do not reconcile",
    );
  }
}
