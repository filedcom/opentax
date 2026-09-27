import { PDFDocument } from "pdf-lib";
import { buildF1040PdfBytes2026 } from "./f1040.ts";
import { buildForm6251PdfBytes2026 } from "./f6251.ts";
import { buildForm5695PdfBytes2026 } from "./form5695.ts";
import { buildForm5329PdfBytes2026 } from "./form5329.ts";
import { buildForm4137PdfBytes2026 } from "./f4137.ts";
import { buildForm8960PdfBytes2026 } from "./f8960.ts";
import { buildSchedule1PdfBytes2026 } from "./schedule1.ts";
import { buildSchedule1APdfBytes2026 } from "./schedule1a.ts";
import { buildScheduleBPdfBytes2026 } from "./schedule_b.ts";
import { buildScheduleDPdfBytes2026 } from "./schedule_d.ts";
import {
  buildForm8949PdfBytes2026,
  filedForm8949Transactions,
  form8949Transactions,
} from "./form8949.ts";
import { isDirectScheduleDTransaction } from "../../nodes/intermediate/aggregation/schedule_d/index.ts";
import { buildSchedule2PdfBytes2026 } from "./schedule2.ts";
import { buildSchedule3APdfBytes2026 } from "./schedule3a.ts";
import { buildSchedule3PdfBytes2026 } from "./schedule3.ts";
import { buildSchedule8812PdfBytes2026 } from "./schedule_8812.ts";
import { buildScheduleHPdfBytes2026 } from "./schedule_h.ts";

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
  readonly schedule1a?: Record<string, unknown>;
  readonly schedule2?: Record<string, unknown>;
  readonly schedule3a?: Record<string, unknown>;
  readonly schedule3?: Record<string, unknown>;
  readonly scheduleB?: Record<string, unknown>;
  readonly scheduleD?: Record<string, unknown>;
  readonly form8949?: Record<string, unknown>;
  readonly form6251?: Record<string, unknown>;
  readonly form5695?: Record<string, unknown>;
  readonly form5329?: Record<string, unknown>;
  readonly form4137?: Record<string, unknown>;
  readonly form8960?: Record<string, unknown>;
  readonly scheduleH?: Record<string, unknown>;
  readonly f8812?: Record<string, unknown>;
}

/** The current main-form and checked TY2026 attachment PDF slice. */
export async function buildCorePdfBytes2026({
  f1040,
  schedule1,
  schedule1a,
  schedule2,
  schedule3a,
  schedule3,
  scheduleB,
  scheduleD,
  form8949,
  form6251,
  form5695,
  form5329,
  form4137,
  form8960,
  scheduleH,
  f8812,
}: CorePdfInput2026): Promise<Uint8Array> {
  const creditDependentCount =
    amount(f1040, "qualifying_child_tax_credit_count") +
    amount(f1040, "other_dependent_count");
  if (creditDependentCount > 0 && !f8812) {
    throw new Error("TY2026 core PDF needs Schedule 8812 calculation");
  }
  if (creditDependentCount === 0 && f8812) {
    throw new Error("TY2026 core PDF Schedule 8812 has no credit dependents");
  }
  if (
    f8812 && (
      amount(f8812, "line14") !==
        (f1040.line19_child_tax_credit === undefined
          ? 0
          : amount(f1040, "line19_child_tax_credit")) ||
      amount(f8812, "line27") !==
        (f1040.line28_actc === undefined ? 0 : amount(f1040, "line28_actc"))
    )
  ) {
    throw new Error("TY2026 core PDF Schedule 8812 disagrees with Form 1040");
  }
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
    f1040.line7a_capital_gain !== undefined &&
    f1040.line7b_schedule_d_not_required !== true && !scheduleD
  ) {
    throw new Error(
      "TY2026 core PDF needs Schedule D for capital gain or loss",
    );
  }
  if (scheduleD && f1040.line7b_schedule_d_not_required === true) {
    throw new Error("TY2026 core PDF Schedule D conflicts with line 7b");
  }
  const scheduleTrades = scheduleD ? form8949Transactions(scheduleD) : [];
  const attachmentTrades = form8949 ? form8949Transactions(form8949) : [];
  if (
    form8949 &&
    JSON.stringify(scheduleTrades) !== JSON.stringify(attachmentTrades)
  ) {
    throw new Error(
      "TY2026 core PDF Form 8949 disagrees with Schedule D trades",
    );
  }
  const filedTrades = form8949 ? filedForm8949Transactions(form8949) : [];
  if (
    !form8949 &&
    scheduleTrades.some((trade) => !isDirectScheduleDTransaction(trade))
  ) {
    throw new Error("TY2026 core PDF needs Form 8949 for adjusted trades");
  }
  if (
    f1040.line7b_schedule_d_not_required === true &&
    optionalAmount(f1040, "line7a_capital_gain") <= 0
  ) {
    throw new Error("TY2026 core PDF Schedule D exception needs a gain");
  }
  if (
    !schedule3 &&
    (optionalAmount(f1040, "line20_nonrefundable_credits") > 0 ||
      optionalAmount(f1040, "line31_other_payments") > 0)
  ) {
    throw new Error("TY2026 core PDF needs Schedule 3 for credits or payments");
  }
  if (
    schedule3 && (
      amount(schedule3, "line8_total") !==
        optionalAmount(f1040, "line20_nonrefundable_credits") ||
      amount(schedule3, "line15_total") !==
        optionalAmount(f1040, "line31_other_payments")
    )
  ) {
    throw new Error("TY2026 core PDF Schedule 3 disagrees with Form 1040");
  }
  if (
    optionalAmount(schedule3 ?? {}, "line5a_residential_clean_energy") > 0 &&
    !form5695
  ) {
    throw new Error("TY2026 core PDF needs Form 5695 for residential credit");
  }
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
    optionalAmount(f1040, "line13a_schedule1a") !==
      optionalAmount(schedule1a ?? {}, "line44_total_additional_deductions")
  ) {
    throw new Error("TY2026 core PDF Schedule 1-A disagrees with Form 1040");
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
  if (form5329 && !schedule2) {
    throw new Error("TY2026 core PDF Form 5329 needs Schedule 2");
  }
  if (
    optionalAmount(schedule2 ?? {}, "line17a_household_employment_tax") > 0 &&
    !scheduleH
  ) {
    throw new Error(
      "TY2026 core PDF needs Schedule H for household employment tax",
    );
  }
  if (
    !form4137 &&
    (optionalAmount(f1040, "line1c_unreported_tips") > 0 ||
      optionalAmount(schedule2 ?? {}, "line16a_form4137_tip_tax") > 0)
  ) {
    throw new Error("TY2026 core PDF needs Form 4137");
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
  if (schedule1a) {
    parts.push(
      await buildSchedule1APdfBytes2026(schedule1a, f1040, {
        name,
        ssn,
      }),
    );
  }
  if (schedule2) {
    parts.push(await buildSchedule2PdfBytes2026(schedule2, { name, ssn }));
  }
  if (schedule3a) {
    parts.push(await buildSchedule3APdfBytes2026(schedule3a, { name, ssn }));
  }
  if (schedule3) {
    parts.push(
      await buildSchedule3PdfBytes2026(schedule3, f1040, { name, ssn }),
    );
  }
  if (f8812?.file_schedule_8812 === true) {
    parts.push(
      await buildSchedule8812PdfBytes2026(f8812, f1040, { name, ssn }),
    );
  }
  if (scheduleB) {
    parts.push(await buildScheduleBPdfBytes2026(scheduleB, { name, ssn }));
  }
  if (scheduleD) {
    parts.push(
      await buildScheduleDPdfBytes2026(scheduleD, f1040, { name, ssn }),
    );
  }
  if (filedTrades.length > 0 && form8949) {
    parts.push(await buildForm8949PdfBytes2026(form8949, { name, ssn }));
  }
  if (form6251) {
    parts.push(await buildForm6251PdfBytes2026(form6251, f1040, { name, ssn }));
  }
  if (form5695) {
    parts.push(
      await buildForm5695PdfBytes2026(form5695, schedule3, { name, ssn }),
    );
  }
  if (form5329) {
    parts.push(await buildForm5329PdfBytes2026(form5329, schedule2!, f1040));
  }
  if (form8960) {
    parts.push(await buildForm8960PdfBytes2026(form8960, { name, ssn }));
  }
  if (form4137) {
    parts.push(
      await buildForm4137PdfBytes2026(
        form4137,
        f1040,
        schedule2 ?? { line16a_form4137_tip_tax: 0 },
      ),
    );
  }
  if (scheduleH) {
    if (!schedule2) {
      throw new Error("TY2026 core PDF Schedule H needs Schedule 2");
    }
    parts.push(
      await buildScheduleHPdfBytes2026(scheduleH, schedule2, { name, ssn }),
    );
  }
  const merged = await PDFDocument.create();
  for (const bytes of parts) {
    const document = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(document, document.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  return merged.save();
}
