import { buildCorePdfBytes2026 } from "./core.ts";

type Pending = Readonly<Record<string, Record<string, unknown>>>;

function record(
  pending: Pending,
  key: string,
): Record<string, unknown> | undefined {
  const value = pending[key];
  return value && Object.keys(value).length > 0 ? value : undefined;
}

function amount(
  fields: Record<string, unknown> | undefined,
  key: string,
): number {
  const value = fields?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Build only the TY2026 attachment set whose PDF pages are implemented. */
export async function buildPdfBytes2026(pending: Pending): Promise<Uint8Array> {
  const f1040 = record(pending, "f1040");
  if (!f1040) throw new Error("TY2026 PDF needs a calculated Form 1040");

  const schedule1a = record(pending, "schedule1a");
  const schedule2 = record(pending, "schedule2");
  if (
    amount(f1040, "line13a_schedule1a") > 0 ||
    amount(schedule1a, "line44_total_additional_deductions") > 0
  ) {
    throw new Error("TY2026 PDF needs the Schedule 1-A attachment");
  }
  if (amount(schedule2, "line16a_form4137_tip_tax") > 0) {
    throw new Error("TY2026 PDF needs the Form 4137 attachment");
  }
  if (amount(schedule2, "line6_niit") > 0) {
    throw new Error("TY2026 PDF needs the Form 8960 attachment");
  }

  const schedule1 = record(pending, "schedule1");
  const scheduleB = record(pending, "schedule_b");
  const form6251 = record(pending, "form6251");
  return buildCorePdfBytes2026({
    f1040,
    schedule1: schedule1?.file_schedule1 === true ? schedule1 : undefined,
    schedule2: schedule2?.line3_part1_tax !== undefined ? schedule2 : undefined,
    schedule3a: record(pending, "schedule3a"),
    scheduleB: scheduleB?.file_schedule_b === true ? scheduleB : undefined,
    form6251: form6251?.line11_amt !== undefined &&
        (amount(form6251, "line11_amt") > 0 ||
          form6251.must_file_for_credit === true)
      ? form6251
      : undefined,
  });
}
