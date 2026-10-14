/**
 * TY2025 Form 8978 negative line 14 worksheets from the Schedule 3 line 6l
 * and Schedule 2 line 17z instructions. `chapter1Part2Tax` must contain only
 * eligible chapter 1 taxes already reported in Schedule 2 Part II, before the
 * Form 8978 adjustment. It must not be the undifferentiated line 23 total.
 */
export function calculateForm8978NegativeAdjustment(
  negativeLine14: number,
  line18: number,
  chapter1Part2Tax: number,
) {
  for (
    const [name, amount] of [
      ["negative Form 8978 line 14", negativeLine14],
      ["Form 1040 line 18", line18],
      ["Schedule 2 Part II chapter 1 tax", chapter1Part2Tax],
    ] as const
  ) {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new Error(`${name} must be a nonnegative whole-dollar amount`);
    }
  }
  const schedule3Line6l = Math.min(negativeLine14, line18);
  const amountAfterSchedule3 = negativeLine14 - schedule3Line6l;
  const schedule2Line17zReduction = Math.min(
    amountAfterSchedule3,
    chapter1Part2Tax,
  );
  return {
    schedule3Line6l,
    amountAfterSchedule3,
    schedule2Line17zReduction,
    remainingUnapplied: amountAfterSchedule3 - schedule2Line17zReduction,
  };
}
