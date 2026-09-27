import { PDFDocument, StandardFonts } from "pdf-lib";
import type { PdfFieldEntry } from "../../pdf/form-descriptor.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { irsScheduleDPdf2026 } from "./forms/schedule_d.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f1040sd.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "0df9af0711964b3198ea04bb0037b29d6afa85578a671553daed46251630b5f1";

type Filer = { name: string; ssn: string };

function amount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`TY2026 Schedule D PDF needs ${key}`);
  }
  return value;
}

function optionalAmount(fields: Record<string, unknown>, key: string): number {
  return fields[key] === undefined ? 0 : amount(fields, key);
}

const supportedKeys = new Set([
  "filing_status",
  "line_6_carryover",
  "line_14_carryover",
  "line13_cap_gain_distrib",
  "qof_disposition",
  "qof_deferral_or_inclusion",
  "other_capital_activity",
  "form4952_filing",
  "print_qof_disposition",
  "print_line7_st_total",
  "print_line13_cap_gain_distrib",
  "print_line15_lt_total",
  "print_line16_combined",
  "print_line17_both_gains",
  "print_line18_28pct",
  "print_line19_unrecaptured_1250",
  "print_line20_qdcgt",
  "print_line21_loss",
]);

function validate(
  schedule: Record<string, unknown>,
  f1040: Record<string, unknown>,
  filer: Filer,
): Record<string, unknown> {
  if (!filer.name.trim() || !filer.ssn.trim()) {
    throw new Error("TY2026 Schedule D PDF needs filer name and SSN");
  }
  if (f1040.line7b_schedule_d_not_required !== false) {
    throw new Error("TY2026 Schedule D PDF conflicts with Form 1040 line 7b");
  }
  if (
    !Object.values(FilingStatus).includes(f1040.filing_status as FilingStatus)
  ) {
    throw new Error("TY2026 Schedule D PDF needs filing status");
  }
  if (
    schedule.qof_disposition !== false ||
    schedule.print_qof_disposition !== false ||
    schedule.qof_deferral_or_inclusion !== false ||
    schedule.other_capital_activity !== false ||
    schedule.form4952_filing !== false
  ) {
    throw new Error("TY2026 Schedule D PDF needs QOF or Form 4952 route");
  }
  if (Object.keys(schedule).some((key) => !supportedKeys.has(key))) {
    throw new Error(
      "TY2026 Schedule D PDF needs source form or Form 8949 detail",
    );
  }
  const shortCarryover = amount(schedule, "line_6_carryover");
  const longCarryover = amount(schedule, "line_14_carryover");
  const distribution = optionalAmount(
    schedule,
    "print_line13_cap_gain_distrib",
  );
  const line7 = amount(schedule, "print_line7_st_total");
  const line15 = amount(schedule, "print_line15_lt_total");
  const line16 = amount(schedule, "print_line16_combined");
  if (
    shortCarryover < 0 || longCarryover < 0 || distribution < 0 ||
    optionalAmount(schedule, "line13_cap_gain_distrib") !== distribution ||
    line7 !== -shortCarryover || line15 !== distribution - longCarryover ||
    line16 !== line7 + line15
  ) {
    throw new Error("TY2026 Schedule D PDF lines do not reconcile");
  }
  if (shortCarryover === 0 && longCarryover === 0) {
    throw new Error("TY2026 Schedule D PDF has no filed-schedule trigger");
  }
  const expected1040 = line16 >= 0 ? line16 : Math.max(
    f1040.filing_status === FilingStatus.MFS ? -1_500 : -3_000,
    line16,
  );
  if (amount(f1040, "line7a_capital_gain") !== expected1040) {
    throw new Error("TY2026 Schedule D PDF disagrees with Form 1040 line 7a");
  }
  const line17Yes = line16 > 0 && line15 > 0;
  if (
    (line16 > 0 && schedule.print_line17_both_gains !== line17Yes) ||
    (line16 <= 0 && schedule.print_line17_both_gains !== undefined)
  ) {
    throw new Error("TY2026 Schedule D PDF line 17 disagrees with gains");
  }
  if (line17Yes && schedule.print_line20_qdcgt !== true) {
    throw new Error("TY2026 Schedule D PDF line 20 needs tax worksheet route");
  }
  if (
    !line17Yes &&
    (schedule.print_line20_qdcgt !== undefined ||
      schedule.print_line18_28pct !== undefined ||
      schedule.print_line19_unrecaptured_1250 !== undefined)
  ) {
    throw new Error("TY2026 Schedule D PDF summary skips lines 18 through 20");
  }
  if (
    (line16 < 0 && amount(schedule, "print_line21_loss") !== expected1040) ||
    (line16 >= 0 && schedule.print_line21_loss !== undefined)
  ) {
    throw new Error("TY2026 Schedule D PDF line 21 disagrees with loss");
  }
  return {
    ...schedule,
    filer_name: filer.name,
    filer_ssn: filer.ssn,
    print_line21_loss: line16 < 0 ? Math.abs(expected1040) : undefined,
    print_line22_qualified_dividends: line17Yes
      ? undefined
      : optionalAmount(f1040, "line3a_qualified_dividends") > 0,
  };
}

function fillField(
  form: ReturnType<PDFDocument["getForm"]>,
  entry: PdfFieldEntry,
  value: unknown,
): void {
  if (value === undefined || value === null) return;
  if (entry.kind === "text") {
    if (
      typeof value === "number" && Math.round(value) === 0 &&
      entry.domainKey !== "print_line16_combined"
    ) return;
    form.getTextField(entry.pdfField).setText(
      typeof value === "number" ? String(Math.round(value)) : String(value),
    );
  } else if (entry.kind === "checkboxWhen") {
    if (String(value) === entry.whenValue) {
      form.getCheckBox(entry.pdfField).check();
    }
  }
}

/** Fill the two printed pages of the pinned 2026 draft Schedule D. */
export async function buildScheduleDPdfBytes2026(
  schedule: Record<string, unknown>,
  f1040: Record<string, unknown>,
  filer: Filer,
): Promise<Uint8Array> {
  const values = validate(schedule, f1040, filer);
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Schedule D hash changed");
  }
  const draft = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = draft.getForm();
  for (const entry of irsScheduleDPdf2026.fields) {
    fillField(form, entry, values[entry.domainKey]);
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten();

  const document = await PDFDocument.create();
  const pages = await document.copyPages(draft, [1, 2]);
  for (const page of pages) document.addPage(page);
  return document.save();
}
