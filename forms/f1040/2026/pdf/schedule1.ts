import { PDFDocument, StandardFonts } from "pdf-lib";
import type { PdfFieldEntry } from "../../pdf/form-descriptor.ts";
import { irsSchedule1Pdf2026 } from "./forms/schedule1.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f1040s1.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "a017a1b717d1c70ff8d831ef8b73c730e5b24f147c394c37f792035a9df22fad";

type Filer = { name: string; ssn: string };

function optionalAmount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (value === undefined) return 0;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`TY2026 Schedule 1 PDF needs numeric ${key}`);
  }
  return value;
}

function validate(
  fields: Record<string, unknown>,
  f1040: Record<string, unknown>,
  filer: Filer,
): void {
  if (fields.file_schedule1 !== true) {
    throw new Error("TY2026 Schedule 1 PDF needs a filed schedule");
  }
  if (!filer.name.trim() || !filer.ssn.trim()) {
    throw new Error("TY2026 Schedule 1 PDF needs filer name and SSN");
  }
  if (
    optionalAmount(fields, "line8z_other") !== 0 &&
    (typeof fields.line8z_description !== "string" ||
      !fields.line8z_description.trim())
  ) {
    throw new Error("TY2026 Schedule 1 PDF line 8z needs an income type");
  }
  const line9 = [
    "line8a_nol_deduction",
    "line8c_cod_income",
    "line8d_foreign_earned_income_exclusion",
    "line8e_archer_msa_dist",
    "line8i_prizes_awards",
    "line8p_excess_business_loss",
    "line8z_other",
  ].reduce((total, key) => total + optionalAmount(fields, key), 0);
  const line10 = [
    "line1_state_refund",
    "line2a_alimony_received",
    "line3_schedule_c",
    "line4_other_gains",
    "line5_schedule_e",
    "line6_schedule_f",
    "line7_unemployment",
  ].reduce((total, key) => total + optionalAmount(fields, key), line9);
  const line25 = optionalAmount(fields, "line24f_501c18d");
  const line26 = [
    "line11_educator_expenses",
    "line12_business_expenses",
    "line13_hsa_deduction",
    "line14_moving_expenses",
    "line15_se_deduction",
    "line16_sep_simple",
    "line17_se_health_insurance",
    "line18_early_withdrawal",
    "line20_ira_deduction",
    "line21_student_loan_interest",
    "line23_archer_msa_deduction",
  ].reduce((total, key) => total + optionalAmount(fields, key), line25);
  if (
    line9 !== optionalAmount(fields, "line9_total_other_income") ||
    line10 !== optionalAmount(fields, "line10_total_additional_income") ||
    line25 !== optionalAmount(fields, "line25_total_other_adjustments") ||
    line26 !== optionalAmount(fields, "line26_total_adjustments")
  ) {
    throw new Error("TY2026 Schedule 1 PDF lines do not reconcile");
  }
  if (
    line10 !== optionalAmount(f1040, "line8_additional_income") ||
    line26 !== optionalAmount(f1040, "line10_adjustments")
  ) {
    throw new Error("TY2026 Schedule 1 PDF disagrees with Form 1040");
  }
}

function fillField(
  form: ReturnType<PDFDocument["getForm"]>,
  entry: PdfFieldEntry,
  value: unknown,
): void {
  if (entry.kind !== "text" || value === undefined || value === null) return;
  if (typeof value === "number" && Math.round(value) === 0) return;
  form.getTextField(entry.pdfField).setText(
    typeof value === "number" ? String(Math.round(value)) : String(value),
  );
}

/** Fill the two printed pages of the pinned TY2026 draft Schedule 1. */
export async function buildSchedule1PdfBytes2026(
  fields: Record<string, unknown>,
  f1040: Record<string, unknown>,
  filer: Filer,
): Promise<Uint8Array> {
  validate(fields, f1040, filer);
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Schedule 1 hash changed");
  }
  const draft = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = draft.getForm();
  const values: Record<string, unknown> = {
    ...fields,
    filer_name: filer.name,
    filer_ssn: filer.ssn,
    line8a_nol_print: Math.abs(optionalAmount(fields, "line8a_nol_deduction")),
    line8d_feie_print: Math.abs(
      optionalAmount(fields, "line8d_foreign_earned_income_exclusion"),
    ),
  };
  for (const entry of irsSchedule1Pdf2026.fields) {
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
