import { PDFDocument } from "pdf-lib";
import { buildF1040PdfBytes2026 } from "./f1040.ts";
import { buildForm6251PdfBytes2026 } from "./f6251.ts";
import { buildForm8960PdfBytes2026 } from "./f8960.ts";
import { buildSchedule1PdfBytes2026 } from "./schedule1.ts";
import { buildScheduleBPdfBytes2026 } from "./schedule_b.ts";
import { buildSchedule2PdfBytes2026 } from "./schedule2.ts";
import { buildSchedule3APdfBytes2026 } from "./schedule3a.ts";

function amount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`TY2026 core PDF needs ${key}`);
  }
  return value;
}

interface CorePdfInput2026 {
  readonly f1040: Record<string, unknown>;
  readonly schedule1?: Record<string, unknown>;
  readonly schedule2?: Record<string, unknown>;
  readonly schedule3a?: Record<string, unknown>;
  readonly scheduleB?: Record<string, unknown>;
  readonly form6251?: Record<string, unknown>;
  readonly form8960?: Record<string, unknown>;
}

/** The current main-form and checked TY2026 attachment PDF slice. */
export async function buildCorePdfBytes2026({
  f1040,
  schedule1,
  schedule2,
  schedule3a,
  scheduleB,
  form6251,
  form8960,
}: CorePdfInput2026): Promise<Uint8Array> {
  const claimsRelevantCredit = [
    "line27a_eic",
    "line28_actc",
    "line29_refundable_aotc",
    "line30_refundable_adoption",
  ].some((key) => {
    if (f1040[key] === undefined) return false;
    return amount(f1040, key) > 0;
  });
  if (claimsRelevantCredit !== (schedule3a !== undefined)) {
    throw new Error(
      "TY2026 core PDF Schedule 3-A presence disagrees with refundable credits",
    );
  }

  if (
    schedule3a && (
      amount(schedule3a, "line1a_refundable_credits") !==
        amount(f1040, "line32a_refundable_credits") ||
      amount(schedule3a, "line1b_other_payments") !==
        amount(f1040, "line31_other_payments") ||
      amount(schedule3a, "line3_total_tax") !==
        amount(f1040, "line24a_total_tax")
    )
  ) {
    throw new Error("TY2026 core PDF Schedule 3-A disagrees with Form 1040");
  }
  if (schedule3a) {
    const benefit = amount(schedule3a, "line6_federal_public_benefit");
    const received = schedule3a.line7_wants_benefit === true &&
      schedule3a.line8_eligible === true;
    const expectedReduction = received ? 0 : benefit;
    if (
      amount(f1040, "line32b_public_benefit_reduction") !== expectedReduction
    ) {
      throw new Error(
        "TY2026 core PDF Schedule 3-A disagrees with Form 1040 line 32b",
      );
    }
  }
  const optionalAmount = (fields: Record<string, unknown>, key: string) =>
    fields[key] === undefined ? 0 : amount(fields, key);
  if (
    !schedule1 &&
    (optionalAmount(f1040, "line8_additional_income") !== 0 ||
      optionalAmount(f1040, "line10_adjustments") !== 0)
  ) {
    throw new Error(
      "TY2026 core PDF needs Schedule 1 for income or adjustments",
    );
  }
  if (
    !scheduleB &&
    (optionalAmount(f1040, "line2b_taxable_interest") > 1_500 ||
      optionalAmount(f1040, "line3b_ordinary_dividends") > 1_500)
  ) {
    throw new Error("TY2026 core PDF needs Schedule B for income over $1,500");
  }
  if (scheduleB) {
    if (
      scheduleB.file_schedule_b !== true ||
      amount(scheduleB, "print_line4_total") !==
        optionalAmount(f1040, "line2b_taxable_interest") ||
      amount(scheduleB, "print_line6_total") !==
        optionalAmount(f1040, "line3b_ordinary_dividends")
    ) {
      throw new Error("TY2026 core PDF Schedule B disagrees with Form 1040");
    }
  }
  if (
    !schedule2 &&
    (optionalAmount(f1040, "line17_additional_taxes") > 0 ||
      optionalAmount(f1040, "line23_other_taxes") > 0)
  ) {
    throw new Error("TY2026 core PDF needs Schedule 2 for additional tax");
  }
  if (schedule2) {
    if (
      amount(schedule2, "line3_part1_tax") !==
        optionalAmount(f1040, "line17_additional_taxes") ||
      amount(schedule2, "line21_total_additional_taxes") !==
        optionalAmount(f1040, "line23_other_taxes")
    ) {
      throw new Error("TY2026 core PDF Schedule 2 disagrees with Form 1040");
    }
  }
  if (
    optionalAmount(schedule2 ?? {}, "line2_amt") !==
      optionalAmount(form6251 ?? {}, "line11_amt")
  ) {
    throw new Error("TY2026 core PDF Form 6251 disagrees with Schedule 2");
  }
  if (
    optionalAmount(schedule2 ?? {}, "line6_niit") !==
      optionalAmount(form8960 ?? {}, "line17_niit")
  ) {
    throw new Error("TY2026 core PDF Form 8960 disagrees with Schedule 2");
  }

  const name = [
    f1040.taxpayer_first_name,
    f1040.taxpayer_middle_initial,
    f1040.taxpayer_last_name,
  ].filter(Boolean).join(" ");
  const ssn = String(f1040.taxpayer_ssn ?? "");
  const mainBytes = await buildF1040PdfBytes2026(f1040);
  const parts = [mainBytes];
  if (schedule1) {
    parts.push(
      await buildSchedule1PdfBytes2026(schedule1, f1040, { name, ssn }),
    );
  }
  if (schedule2) {
    parts.push(await buildSchedule2PdfBytes2026(schedule2, { name, ssn }));
  }
  if (schedule3a) {
    parts.push(await buildSchedule3APdfBytes2026(schedule3a, { name, ssn }));
  }
  if (scheduleB) {
    parts.push(await buildScheduleBPdfBytes2026(scheduleB, { name, ssn }));
  }
  if (form6251) {
    parts.push(await buildForm6251PdfBytes2026(form6251, f1040, { name, ssn }));
  }
  if (form8960) {
    parts.push(await buildForm8960PdfBytes2026(form8960, { name, ssn }));
  }
  const merged = await PDFDocument.create();
  for (const bytes of parts) {
    const document = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(document, document.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  return merged.save();
}
