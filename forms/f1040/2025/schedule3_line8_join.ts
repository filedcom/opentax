/** The 2025 Schedule 3 line 8 is carried to Form 1040 line 20. */
export function assertSchedule3Line8Join(
  schedule3: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (!pending || !("f1040" in pending)) return;
  const returnValue = pending.f1040;
  if (
    returnValue === null || typeof returnValue !== "object" ||
    Array.isArray(returnValue)
  ) {
    throw new Error("Schedule 3 line 8 needs a finalized Form 1040");
  }
  const form1040 = returnValue as Readonly<Record<string, unknown>>;
  const cents = (value: unknown, line: string): number => {
    if (value === undefined) return 0;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error(`Schedule 3 ${line} needs a nonnegative amount`);
    }
    const amount = Math.round(value * 100);
    if (
      !Number.isSafeInteger(amount) ||
      Math.abs(value * 100 - amount) > 0.000001
    ) {
      throw new Error(`Schedule 3 ${line} needs cent precision`);
    }
    return amount;
  };
  if (
    cents(schedule3.line8_total, "line 8") !==
      cents(form1040.line20_nonrefundable_credits, "Form 1040 line 20")
  ) {
    throw new Error(
      "Schedule 3 line 8 does not reconcile to Form 1040 line 20",
    );
  }
}
