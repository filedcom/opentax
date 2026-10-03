import { FilingStatus } from "../nodes/types.ts";

type Pending = Readonly<Record<string, unknown>>;

/** Compare the finalized Schedule D result with the amount filed on Form 1040. */
export function assertScheduleD1040Join(pending: Pending): void {
  const rawSchedule = pending.schedule_d;
  if (rawSchedule === undefined) return;
  if (rawSchedule === null || typeof rawSchedule !== "object") {
    throw new Error("Schedule D needs finalized calculation fields");
  }
  const schedule = rawSchedule as Record<string, unknown>;
  if (schedule.active_4797_final_no_schedule_d === true) return;
  const line16 = schedule.print_line16_combined;
  // Descriptor-only callers can submit an isolated Schedule D field. A
  // finalized return carries the calculated print total and Form 1040 join.
  if (line16 === undefined) return;
  const raw1040 = pending.f1040;
  if (raw1040 === null || typeof raw1040 !== "object") {
    throw new Error("Schedule D needs Form 1040 line 7");
  }
  const form1040 = raw1040 as Record<string, unknown>;
  if (typeof line16 !== "number" || !Number.isFinite(line16)) {
    throw new Error("Schedule D needs finalized line 16 before export");
  }
  const limit = form1040.filing_status === FilingStatus.MFS ? -1_500 : -3_000;
  const expected = line16 < 0 ? Math.max(line16, limit) : line16;
  const filed = form1040.line7_capital_gain;
  if (
    typeof filed !== "number" || !Number.isFinite(filed) ||
    Math.abs(filed - expected) >= 0.01 ||
    (line16 < 0 && schedule.print_line21_loss !== expected)
  ) {
    throw new Error(
      "Form 1040 line 7 must match finalized Schedule D line 16 or limited line 21 loss",
    );
  }
}
