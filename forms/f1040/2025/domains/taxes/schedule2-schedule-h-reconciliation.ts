import {
  computeScheduleHAmounts,
  inputSchema as scheduleHInputSchema,
} from "../../../nodes/intermediate/forms/schedule_h/index.ts";

/** Replay Schedule H line 26 into the filed Schedule 2 line 9 tax. */
export function assertSchedule2ScheduleHTax(
  pending: Readonly<Record<string, unknown>>,
): void {
  const fields = pending.schedule2 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const source = pending.schedule_h;
  const tax = source === undefined ? 0 : computeScheduleHAmounts(
    scheduleHInputSchema.parse(source),
    2025,
  ).totalTax;
  if ((fields?.line9_household_employment ?? 0) !== tax) {
    throw new Error(
      "Schedule 2 line 9 differs from retained Schedule H tax",
    );
  }
}
