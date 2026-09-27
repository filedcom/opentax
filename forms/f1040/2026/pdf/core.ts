import { PDFDocument } from "pdf-lib";
import { buildF1040PdfBytes2026 } from "./f1040.ts";
import { buildSchedule3APdfBytes2026 } from "./schedule3a.ts";

function amount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`TY2026 core PDF needs ${key}`);
  }
  return value;
}

/** The current main-form and Schedule 3-A PDF slice, not the full return bundle. */
export async function buildCorePdfBytes2026(
  f1040: Record<string, unknown>,
  schedule3a?: Record<string, unknown>,
): Promise<Uint8Array> {
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

  if (!schedule3a) return buildF1040PdfBytes2026(f1040);
  if (
    amount(schedule3a, "line1a_refundable_credits") !==
      amount(f1040, "line32a_refundable_credits") ||
    amount(schedule3a, "line1b_other_payments") !==
      amount(f1040, "line31_other_payments") ||
    amount(schedule3a, "line3_total_tax") !==
      amount(f1040, "line24a_total_tax")
  ) {
    throw new Error("TY2026 core PDF Schedule 3-A disagrees with Form 1040");
  }
  const benefit = amount(schedule3a, "line6_federal_public_benefit");
  const received = schedule3a.line7_wants_benefit === true &&
    schedule3a.line8_eligible === true;
  const expectedReduction = received ? 0 : benefit;
  if (amount(f1040, "line32b_public_benefit_reduction") !== expectedReduction) {
    throw new Error(
      "TY2026 core PDF Schedule 3-A disagrees with Form 1040 line 32b",
    );
  }

  const name = [
    f1040.taxpayer_first_name,
    f1040.taxpayer_middle_initial,
    f1040.taxpayer_last_name,
  ].filter(Boolean).join(" ");
  const ssn = String(f1040.taxpayer_ssn ?? "");
  const mainBytes = await buildF1040PdfBytes2026(f1040);
  const scheduleBytes = await buildSchedule3APdfBytes2026(schedule3a, {
    name,
    ssn,
  });
  const merged = await PDFDocument.create();
  for (const bytes of [mainBytes, scheduleBytes]) {
    const document = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(document, document.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  return merged.save();
}
