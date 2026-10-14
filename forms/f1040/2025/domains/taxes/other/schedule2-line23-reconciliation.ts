import { schedule2Part2Total } from "../../../../nodes/intermediate/aggregation/taxes/other/schedule2/index.ts";

/** Join Schedule 2 line 21 to Form 1040 line 23 after the Form 8978 offset. */
export function assertSchedule2Line23(
  filed: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (!pending) return;
  const worksheet = pending.form8978_reporting_year as
    | Record<string, unknown>
    | undefined;
  const reduction = worksheet?.schedule2_line17z_reduction ?? 0;
  if (
    typeof reduction !== "number" || !Number.isFinite(reduction) ||
    reduction < 0
  ) {
    throw new Error("Schedule 2 Form 8978 reduction must be nonnegative");
  }
  const schedule2 = pending.schedule2;
  if (!schedule2) {
    if (reduction > 0) {
      throw new Error("Form 8978 line 17z reduction needs Schedule 2");
    }
    return;
  }
  const gross = schedule2Part2Total(schedule2);
  const expected = gross - reduction;
  if (expected < -0.01) {
    throw new Error("Form 8978 reduction exceeds Schedule 2 Part II tax");
  }
  const matches = (value: unknown): boolean =>
    typeof value === "number" && Number.isFinite(value) &&
    Math.abs(value - expected) < 0.01;
  if (
    worksheet?.schedule2_line21 !== undefined &&
    !matches(worksheet.schedule2_line21)
  ) {
    throw new Error(
      "Form 8978 adjusted Schedule 2 line 21 differs from its source taxes",
    );
  }
  const line23 = filed.line23_other_taxes;
  if (
    (expected > 0.01 && !matches(line23)) ||
    (line23 !== undefined && !matches(line23))
  ) {
    throw new Error(
      "Form 1040 line 23 differs from adjusted Schedule 2 line 21",
    );
  }
}
