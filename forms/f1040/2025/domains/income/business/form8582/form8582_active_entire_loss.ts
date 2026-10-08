import { FilingStatus } from "../../../../../nodes/types.ts";
import {
  computePropertyNet,
  itemSchema,
} from "../../../../../nodes/inputs/income/rental-passthrough/schedule_e/index.ts";
import { passiveSaleGain } from "../../../../../nodes/intermediate/forms/income/business/form4797/index.ts";

/** The bounded active-rental overall-loss route files only a single return. */
export function assertSingleFilerActiveEntireLoss(
  activity: { readonly activity_type?: string },
  pending: {
    readonly f1040?: unknown;
    readonly schedule1?: unknown;
    readonly schedule_e?: unknown;
  } | undefined,
): void {
  if (activity.activity_type !== "A") return;
  const source = itemSchema.parse(activity);
  const sale = source.passive_property_sales?.[0];
  const form1040 = pending?.f1040;
  const schedule1 = pending?.schedule1;
  const scheduleE = pending?.schedule_e;
  const final1040 = form1040 as Record<string, unknown> | undefined;
  const finalSchedule1 = schedule1 as Record<string, unknown> | undefined;
  const finalScheduleE = scheduleE as Record<string, unknown> | undefined;
  const filedActivities = finalScheduleE?.schedule_es;
  const soleFiledActivity = Array.isArray(filedActivities) &&
      filedActivities.length === 1
    ? itemSchema.parse(filedActivities[0])
    : undefined;
  if (
    !sale || !final1040 || !finalSchedule1 || !soleFiledActivity ||
    JSON.stringify(soleFiledActivity) !== JSON.stringify(source) ||
    final1040.filing_status !== FilingStatus.Single ||
    finalSchedule1.line4_other_gains !== passiveSaleGain(sale) ||
    finalSchedule1.line5_schedule_e !== computePropertyNet(source) ||
    finalSchedule1.line10_total_additional_income !==
      passiveSaleGain(sale) + computePropertyNet(source) ||
    final1040.line8_additional_income !==
      finalSchedule1.line10_total_additional_income ||
    final1040.line11_agi !==
      Number(final1040.line9_total_income) -
        Number(final1040.line10_adjustments ?? 0)
  ) {
    throw new Error(
      "First-year active-rental entire-disposition loss needs exact Schedule E, Form 4797, Schedule 1, and single-filer Form 1040 totals",
    );
  }
}
