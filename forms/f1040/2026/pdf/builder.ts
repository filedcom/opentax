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

  const schedule1 = record(pending, "schedule1");
  const scheduleB = record(pending, "schedule_b");
  const scheduleD = record(pending, "schedule_d");
  const form6251 = record(pending, "form6251");
  const form8960 = record(pending, "form8960");
  const form4137 = record(pending, "form4137");
  return buildCorePdfBytes2026({
    f1040,
    schedule1: schedule1?.file_schedule1 === true ? schedule1 : undefined,
    schedule1a: amount(schedule1a, "line44_total_additional_deductions") > 0
      ? schedule1a
      : undefined,
    schedule2: schedule2?.line3_part1_tax !== undefined ? schedule2 : undefined,
    schedule3a: record(pending, "schedule3a"),
    scheduleB: scheduleB?.file_schedule_b === true ? scheduleB : undefined,
    scheduleD: scheduleD?.print_line16_combined !== undefined
      ? scheduleD
      : undefined,
    form6251: form6251?.line11_amt !== undefined &&
        (amount(form6251, "line11_amt") > 0 ||
          form6251.must_file_for_credit === true)
      ? form6251
      : undefined,
    form8960: amount(form8960, "line17_niit") > 0 ? form8960 : undefined,
    form4137: amount(f1040, "line1c_unreported_tips") > 0 ||
        amount(schedule2, "line16a_form4137_tip_tax") > 0
      ? form4137
      : undefined,
  });
}
